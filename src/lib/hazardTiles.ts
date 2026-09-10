/**
 * 国土地理院 ハザードマップポータルサイトが提供するハザードタイルのURLテンプレート。
 * PropertyMap（表示用レイヤー）とhazardCheck（座標のハザード有無判定）の両方から参照する共通定義。
 */
export const HAZARD_TILE_TEMPLATES = {
  flood: ["https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png"],
  sediment: [
    "https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png",
    "https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png",
    "https://disaportaldata.gsi.go.jp/raster/05_jisuberikeikaikuiki/{z}/{x}/{y}.png",
  ],
  tsunami: ["https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png"],
} as const;

export type HazardCategory = keyof typeof HAZARD_TILE_TEMPLATES;

export const HAZARD_LABELS: Record<HazardCategory, string> = {
  flood: "洪水浸水想定区域（想定最大規模）",
  sediment: "土砂災害警戒区域",
  tsunami: "津波浸水想定",
};
