import { isIP } from "node:net";

interface KomariRpcResponse {
  result?: Record<string, KomariNode>;
  error?: { code: number; message: string };
}

interface KomariNode {
  uuid: string;
  name: string;
  ipv4?: string;
  ipv6?: string;
  hidden?: boolean;
  region?: string;
}

interface KomariNodesResponse {
  data?: KomariNode[];
}

export interface PublicNode {
  uuid: string;
  name: string;
  region: string;
}

interface GeoResult {
  lat: number;
  lng: number;
  city: string;
  country: string;
  countryCode: string;
}

export interface NodeLocation extends GeoResult {
  uuid: string;
  name: string;
}

export interface NodeLocationsFile {
  version: 1;
  generatedAt: string | null;
  nodes: PublicNode[];
  locations: NodeLocation[];
}

export interface NodeLocationBuildOptions {
  komariApiKey?: string;
}

const KOMARI_BASE_URL = "https://ops.zhouhaoze.top";

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const value = ip.toLowerCase();
    return value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
  }

  const parts = ip.split(".").map(Number);
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function firstPublicIp(node: KomariNode): string | null {
  for (const rawValue of [node.ipv4, node.ipv6]) {
    if (!rawValue) continue;
    for (const rawCandidate of rawValue.split(/[\s,]+/)) {
      const candidate = rawCandidate.replace(/^\[|\]$/g, "").split("/")[0];
      if (isIP(candidate) && !isPrivateIp(candidate)) return candidate;
    }
  }
  return null;
}

async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "PersonalWeb build",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

function geoResult(
  latValue: unknown,
  lngValue: unknown,
  cityValue: unknown,
  countryValue: unknown,
  countryCodeValue: unknown,
): GeoResult | null {
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {
    lat,
    lng,
    city: typeof cityValue === "string" ? cityValue : "",
    country: typeof countryValue === "string" ? countryValue : "",
    countryCode: typeof countryCodeValue === "string" ? countryCodeValue : "",
  };
}

async function locateWithIpSb(ip: string): Promise<GeoResult | null> {
  const data = await fetchJson(`https://api.ip.sb/geoip/${encodeURIComponent(ip)}`);
  return geoResult(data.latitude, data.longitude, data.city, data.country, data.country_code);
}

async function locateWithIpinfo(ip: string): Promise<GeoResult | null> {
  const data = await fetchJson(`https://ipinfo.io/${encodeURIComponent(ip)}/json`);
  if (typeof data.loc !== "string") return null;
  const [lat, lng] = data.loc.split(",");
  return geoResult(lat, lng, data.city, data.country, data.country);
}

async function locateWithIpWho(ip: string): Promise<GeoResult | null> {
  const data = await fetchJson(
    `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,city,latitude,longitude`,
  );
  if (data.success !== true) return null;
  return geoResult(data.latitude, data.longitude, data.city, data.country, data.country_code);
}

async function locateWithIpapi(ip: string): Promise<GeoResult | null> {
  const data = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (data.error === true) return null;
  return geoResult(data.latitude, data.longitude, data.city, data.country_name, data.country_code);
}

async function locateIp(ip: string): Promise<GeoResult | null> {
  const providers = [locateWithIpSb, locateWithIpinfo, locateWithIpWho, locateWithIpapi];
  for (const provider of providers) {
    try {
      const result = await provider(ip);
      if (result) return result;
    } catch {
      // Continue in provider order; the client keeps its country-level fallback if all fail.
    }
  }
  return null;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function fetchKomariNodes(apiKey: string): Promise<KomariNode[]> {
  const payload = await fetchJson(`${KOMARI_BASE_URL}/api/rpc2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "common:getNodes", params: {} }),
  });
  const rpc = payload as KomariRpcResponse;
  if (rpc.error) throw new Error(`Komari RPC ${rpc.error.code}: ${rpc.error.message}`);
  if (!rpc.result || Array.isArray(rpc.result)) throw new Error("Komari RPC returned an invalid node map.");
  return Object.values(rpc.result).filter((node) => !node.hidden);
}

async function fetchPublicNodes(): Promise<PublicNode[]> {
  const payload = (await fetchJson(`${KOMARI_BASE_URL}/api/nodes`)) as KomariNodesResponse;
  if (!Array.isArray(payload.data)) throw new Error("Komari public API returned an invalid node list.");
  return payload.data.map((node) => ({ uuid: node.uuid, name: node.name, region: node.region ?? "" }));
}

export async function generateNodeLocations(options: NodeLocationBuildOptions): Promise<NodeLocationsFile> {
  const publicNodes = await fetchPublicNodes();
  if (!options.komariApiKey) {
    return { version: 1, generatedAt: new Date().toISOString(), nodes: publicNodes, locations: [] };
  }

  const nodes = await fetchKomariNodes(options.komariApiKey);
  const nodesWithIp = nodes.flatMap((node) => {
    const ip = firstPublicIp(node);
    return ip ? [{ node, ip }] : [];
  });
  const uniqueIps = [...new Set(nodesWithIp.map(({ ip }) => ip))];
  const resolved = await mapWithConcurrency(uniqueIps, 4, async (ip) => [ip, await locateIp(ip)] as const);
  const locationsByIp = new Map(resolved.filter((entry): entry is readonly [string, GeoResult] => entry[1] !== null));

  const locations = nodesWithIp.flatMap(({ node, ip }) => {
    const location = locationsByIp.get(ip);
    return location ? [{ uuid: node.uuid, name: node.name, ...location }] : [];
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    nodes: publicNodes,
    locations,
  };
}
