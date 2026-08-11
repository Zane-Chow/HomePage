import { infraFallback } from "./data/infra";

const KOMARI_BASE_URL = "https://ops.zhouhaoze.top";

interface KomariNode {
  name: string;
  region: string; // flag emoji per Komari's public API
}

interface KomariNodesResponse {
  data: KomariNode[];
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
  live: boolean;
}

export async function fetchInfraSnapshot(): Promise<InfraSnapshot> {
  if (!KOMARI_BASE_URL) {
    return {
      serverCount: infraFallback.serverCount,
      regionCount: infraFallback.regionCount,
      regions: [],
      regionBreakdown: [],
      live: false,
    };
  }

  try {
    const res = await fetch(`${KOMARI_BASE_URL}/api/nodes`, {
      signal: AbortSignal.timeout(5000),
    });
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
      live: true,
    };
  } catch {
    return {
      serverCount: infraFallback.serverCount,
      regionCount: infraFallback.regionCount,
      regions: [],
      regionBreakdown: [],
      live: false,
    };
  }
}
