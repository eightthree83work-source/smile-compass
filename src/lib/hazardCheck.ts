import { HazardFlag } from "./shareSummary";
import { HAZARD_TILE_TEMPLATES } from "./hazardTiles";

/**
 * 緯度経度が、国土地理院のハザードタイル（ラスタ画像）上で色が塗られた範囲に含まれるかを、
 * Canvasでピクセルのアルファ値を読み取って判定する（ブラウザ専用。サーバーサイドでは呼び出さない）。
 * 正式なハザードマップ確認の代わりにはならない簡易判定であることに留意する。
 */

const ZOOM = 17;
const TILE_SIZE = 256;

export interface HazardCheckResult {
  flood: HazardFlag;
  sediment: HazardFlag;
  tsunami: HazardFlag;
}

function latLonToTilePixel(lat: number, lon: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  const worldX = ((lon + 180) / 360) * scale;
  const worldY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;

  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);
  const pixelX = Math.min(TILE_SIZE - 1, Math.max(0, Math.floor(worldX - tileX * TILE_SIZE)));
  const pixelY = Math.min(TILE_SIZE - 1, Math.max(0, Math.floor(worldY - tileY * TILE_SIZE)));

  return { tileX, tileY, pixelX, pixelY };
}

function buildTileUrl(template: string, zoom: number, tileX: number, tileY: number): string {
  return template.replace("{z}", String(zoom)).replace("{x}", String(tileX)).replace("{y}", String(tileY));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`画像の読み込みに失敗しました: ${url}`));
    img.src = url;
  });
}

async function isPixelOpaque(tileUrl: string, pixelX: number, pixelY: number): Promise<boolean> {
  const img = await loadImage(tileUrl);
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d contextを取得できませんでした");
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(pixelX, pixelY, 1, 1);
  return data[3] > 10;
}

async function checkCategory(templates: readonly string[], tileX: number, tileY: number, pixelX: number, pixelY: number): Promise<HazardFlag> {
  const settled = await Promise.allSettled(
    templates.map((template) => isPixelOpaque(buildTileUrl(template, ZOOM, tileX, tileY), pixelX, pixelY)),
  );
  const succeeded = settled.filter(
    (result): result is PromiseFulfilledResult<boolean> => result.status === "fulfilled",
  );
  if (succeeded.length === 0) return "unknown";
  return succeeded.some((result) => result.value) ? "yes" : "no";
}

export async function checkHazardAtPoint(lat: number, lon: number): Promise<HazardCheckResult> {
  const { tileX, tileY, pixelX, pixelY } = latLonToTilePixel(lat, lon, ZOOM);

  const [flood, sediment, tsunami] = await Promise.all([
    checkCategory(HAZARD_TILE_TEMPLATES.flood, tileX, tileY, pixelX, pixelY),
    checkCategory(HAZARD_TILE_TEMPLATES.sediment, tileX, tileY, pixelX, pixelY),
    checkCategory(HAZARD_TILE_TEMPLATES.tsunami, tileX, tileY, pixelX, pixelY),
  ]);

  return { flood, sediment, tsunami };
}
