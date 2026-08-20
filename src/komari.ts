import { infraFallback } from "./data/infra";

const KOMARI_BASE_URL = "https://ops.zhouhaoze.top";

interface KomariNode {
  uuid: string;
  name: string;
  region: string; // flag emoji per Komari's public API
}

interface KomariNodesResponse {
  data: KomariNode[];
}

export interface NodeLocation {
  uuid: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  countryCode: string;
}

interface NodeLocationsFile {
  version: number;
  nodes: KomariNode[];
  locations: NodeLocation[];
}

export interface RegionBreakdown {
  flag: string;
  count: number;
}

export interface InfraSnapshot {
  serverCount: number;
  regionCount: number;
  regions: string[];
  regionBreakdown: RegionBreakdown[];
  nodes: KomariNode[];
  nodeLocations: NodeLocation[];
  live: boolean;
}

interface NodeMapData {
  nodes: KomariNode[];
  locations: NodeLocation[];
}

async function fetchNodeMap(): Promise<NodeMapData> {
  try {
    const response = await fetch("/node-locations.json", { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { nodes: [], locations: [] };
    const body: NodeLocationsFile = await response.json();
    if (body.version !== 1 || !Array.isArray(body.nodes) || !Array.isArray(body.locations)) {
      return { nodes: [], locations: [] };
    }
    const nodes = body.nodes.filter(
      (node) => typeof node.uuid === "string" && typeof node.name === "string" && typeof node.region === "string",
    );
    const locations = body.locations.filter(
      (location) =>
        typeof location.uuid === "string" &&
        Number.isFinite(location.lat) &&
        Number.isFinite(location.lng) &&
        Math.abs(location.lat) <= 90 &&
        Math.abs(location.lng) <= 180,
    );
    return { nodes, locations };
  } catch {
    return { nodes: [], locations: [] };
  }
}

export async function fetchInfraSnapshot(): Promise<InfraSnapshot> {
  const nodeMapPromise = fetchNodeMap();
  if (!KOMARI_BASE_URL) {
    const nodeMap = await nodeMapPromise;
    return {
      serverCount: infraFallback.serverCount,
      regionCount: infraFallback.regionCount,
      regions: [],
      regionBreakdown: [],
      nodes: nodeMap.nodes,
      nodeLocations: nodeMap.locations,
      live: false,
    };
  }

  try {
    const [res, nodeMap] = await Promise.all([
      fetch(`${KOMARI_BASE_URL}/api/nodes`, { signal: AbortSignal.timeout(5000) }),
      nodeMapPromise,
    ]);
    if (!res.ok) throw new Error(`Komari responded ${res.status}`);
    const body: KomariNodesResponse = await res.json();
    const nodes = body.data;

    const counts = new Map<string, number>();
    for (const n of nodes) {
      if (!n.region) continue;
      counts.set(n.region, (counts.get(n.region) ?? 0) + 1);
    }
    const regionBreakdown = Array.from(counts, ([flag, count]) => ({ flag, count }));
    const regions = regionBreakdown.map((r) => r.flag);

    return {
      serverCount: nodes.length || infraFallback.serverCount,
      regionCount: regions.length || infraFallback.regionCount,
      regions,
      regionBreakdown,
      nodes,
      nodeLocations: nodeMap.locations,
      live: true,
    };
  } catch {
    const nodeMap = await nodeMapPromise;
    return {
      serverCount: nodeMap.nodes.length || infraFallback.serverCount,
      regionCount: infraFallback.regionCount,
      regions: [],
      regionBreakdown: [],
      nodes: nodeMap.nodes,
      nodeLocations: nodeMap.locations,
      live: false,
    };
  }
}
