/**
 * 国土地理院のジオコーディングAPI（APIキー不要）を使い、住所文字列から緯度経度を取得する。
 * https://msearch.gsi.go.jp/address-search/AddressSearch
 */

export interface GeocodeResult {
  lat: number;
  lon: number;
  /** APIが認識した住所表記 */
  matchedAddress: string;
}

interface GsiAddressSearchFeature {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    title?: string;
  };
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const res = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(trimmed)}`);
  if (!res.ok) return null;

  const data: unknown = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0] as GsiAddressSearchFeature;
  const coordinates = first.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;

  const [lon, lat] = coordinates;
  if (typeof lat !== "number" || typeof lon !== "number" || Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }

  return { lat, lon, matchedAddress: first.properties?.title ?? trimmed };
}
