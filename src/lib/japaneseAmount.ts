/**
 * 円単位の金額を「1億2,500万円」のような日本語の位取り表記に変換する。
 * 桁数の多い金額入力（物件価格など）で、意図した桁数で入力できているかを
 * 目視確認しやすくするための補助表示に使う。
 * 0以下・非有限値（入力途中でNaN/undefinedになる場合を含む）はnullを返す。
 */
export function formatJapaneseYen(value: number | undefined): string | null {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return null;

  const rounded = Math.floor(value);
  const oku = Math.floor(rounded / 100_000_000);
  const man = Math.floor((rounded % 100_000_000) / 10_000);
  const yen = rounded % 10_000;

  let result = "";
  if (oku > 0) result += `${oku.toLocaleString("ja-JP")}億`;
  if (man > 0) result += `${man.toLocaleString("ja-JP")}万`;
  if (yen > 0) result += `${yen.toLocaleString("ja-JP")}`;
  result += "円";

  return result;
}
