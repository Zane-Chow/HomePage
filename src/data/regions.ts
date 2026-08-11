export interface RegionInfo {
  code: string;
  lat: number;
  lng: number;
  name: string;
}

const REGION_TABLE: Record<string, RegionInfo> = {
  HK: { code: "HK", lat: 22.3193, lng: 114.1694, name: "Hong Kong" },
  SG: { code: "SG", lat: 1.3521, lng: 103.8198, name: "Singapore" },
  CN: { code: "CN", lat: 39.9042, lng: 116.4074, name: "China" },
  DE: { code: "DE", lat: 50.1109, lng: 8.6821, name: "Germany" },
  JP: { code: "JP", lat: 35.6762, lng: 139.6503, name: "Japan" },
  CA: { code: "CA", lat: 43.6532, lng: -79.3832, name: "Canada" },
  GB: { code: "GB", lat: 51.5072, lng: -0.1276, name: "United Kingdom" },
  US: { code: "US", lat: 37.3382, lng: -121.8863, name: "United States" },
  NL: { code: "NL", lat: 52.3676, lng: 4.9041, name: "Netherlands" },
  AU: { code: "AU", lat: -33.8688, lng: 151.2093, name: "Australia" },
  KR: { code: "KR", lat: 37.5665, lng: 126.978, name: "South Korea" },
  TR: { code: "TR", lat: 41.0082, lng: 28.9784, name: "Turkey" },
  IN: { code: "IN", lat: 19.076, lng: 72.8777, name: "India" },
  ID: { code: "ID", lat: -6.2088, lng: 106.8456, name: "Indonesia" },
  MY: { code: "MY", lat: 3.139, lng: 101.6869, name: "Malaysia" },
  BR: { code: "BR", lat: -23.5505, lng: -46.6333, name: "Brazil" },
  VN: { code: "VN", lat: 21.0278, lng: 105.8342, name: "Vietnam" },
  TW: { code: "TW", lat: 25.033, lng: 121.5654, name: "Taiwan" },
};

const REGIONAL_INDICATOR_BASE = 0x1f1e6;

export function flagToRegionInfo(flag: string): RegionInfo | null {
  const chars = Array.from(flag);
  if (chars.length !== 2) return null;
  const letters = chars.map((c) => {
    const codePoint = c.codePointAt(0);
    if (codePoint === undefined) return null;
    const offset = codePoint - REGIONAL_INDICATOR_BASE;
    if (offset < 0 || offset > 25) return null;
    return String.fromCharCode(65 + offset);
  });
  if (letters.some((l) => l === null)) return null;
  const code = letters.join("");
  return REGION_TABLE[code] ?? null;
}
