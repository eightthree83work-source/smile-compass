/**
 * HeartRails Express API（APIキー不要）を使い、緯度経度から最寄り駅一覧を取得する。
 * http://express.heartrails.com/api/json?method=getStations
 *
 * APIは同一駅でも路線ごとに1件ずつ返すため、同じ駅・同じ距離のものはまとめて1件にする。
 */

export interface NearestStation {
  name: string;
  lines: string[];
  /** 直線距離（メートル） */
  distanceMeters: number;
  lat: number;
  lon: number;
}

interface HeartRailsStation {
  name?: string;
  line?: string;
  x?: number | string;
  y?: number | string;
  distance?: string;
}

interface HeartRailsResponse {
  response?: {
    station?: HeartRailsStation[];
    error?: string;
  };
}

function parseDistanceMeters(distance: string | undefined): number | null {
  if (!distance) return null;
  const match = distance.match(/([\d.]+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isNaN(value) ? null : value;
}

export async function fetchNearestStations(lat: number, lon: number): Promise<NearestStation[] | null> {
  const res = await fetch(`https://express.heartrails.com/api/json?method=getStations&x=${lon}&y=${lat}`);
  if (!res.ok) return null;

  const data = (await res.json()) as HeartRailsResponse;
  const stations = data.response?.station;
  if (!stations || stations.length === 0) return null;

  const grouped = new Map<string, NearestStation>();
  for (const station of stations) {
    const stationLat = Number(station.y);
    const stationLon = Number(station.x);
    const distanceMeters = parseDistanceMeters(station.distance);
    if (!station.name || Number.isNaN(stationLat) || Number.isNaN(stationLon) || distanceMeters === null) continue;

    const key = `${station.name}@${distanceMeters}`;
    const existing = grouped.get(key);
    if (existing) {
      if (station.line && !existing.lines.includes(station.line)) existing.lines.push(station.line);
    } else {
      grouped.set(key, {
        name: station.name,
        lines: station.line ? [station.line] : [],
        distanceMeters,
        lat: stationLat,
        lon: stationLon,
      });
    }
  }

  const result = Array.from(grouped.values()).sort((a, b) => a.distanceMeters - b.distanceMeters);
  return result.length > 0 ? result : null;
}
