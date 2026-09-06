export type AreaUnit = "sqm" | "tsubo";

/** 1坪 = 3.30578㎡ */
export const SQM_PER_TSUBO = 3.30578;

export function sqmToTsubo(sqm: number): number {
  return sqm / SQM_PER_TSUBO;
}

export function tsuboToSqm(tsubo: number): number {
  return tsubo * SQM_PER_TSUBO;
}
