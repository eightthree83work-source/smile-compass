export type AreaUnit = "sqm" | "tsubo";

/** 1坪 = 3.30578㎡ */
export const SQM_PER_TSUBO = 3.30578;

/** ㎡表示の丸め桁数（小数第2位まで） */
const SQM_DECIMAL_PLACES = 2;
/** 坪表示の丸め桁数（小数第2位まで） */
const TSUBO_DECIMAL_PLACES = 2;

/**
 * 指定した小数桁数に丸める。坪⇄㎡の変換はどちらも割り切れない無理数的な係数のため、
 * 丸めずに状態へ保存すると「70.99999999999999」のような浮動小数点誤差がそのまま
 * 入力欄に表示されてしまう。変換関数の中でこの丸めを一元的に行うことで、
 * 表示・保存される値を常にきれいな小数に保つ（変換を何度往復しても誤差が蓄積しない）。
 */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function sqmToTsubo(sqm: number): number {
  return roundTo(sqm / SQM_PER_TSUBO, TSUBO_DECIMAL_PLACES);
}

export function tsuboToSqm(tsubo: number): number {
  return roundTo(tsubo * SQM_PER_TSUBO, SQM_DECIMAL_PLACES);
}
