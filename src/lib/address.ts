/** 都道府県名の末尾候補。「都」「道」「府」は他の文字（例：京都府の「都」）と誤マッチしやすいため、実在する4つの名称を先に固定で判定する */
const SPECIAL_PREFECTURE_NAMES = ["東京都", "北海道", "大阪府", "京都府"];

/**
 * 住所文字列から「都道府県＋市区町村」までを抜き出す。
 * 例：「東京都荒川区東尾久5-41-6」→「東京都荒川区」
 * 認識できないフォーマットの場合はnullを返す（呼び出し側で安全なフォールバック表示に使う）。
 */
export function truncateAddressToCityLevel(address: string): string | null {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const prefecture =
    SPECIAL_PREFECTURE_NAMES.find((name) => trimmed.startsWith(name)) ?? trimmed.match(/^.+?県/)?.[0];
  if (!prefecture) return null;

  const rest = trimmed.slice(prefecture.length);
  const city = rest.match(/^.+?[市区町村]/)?.[0];

  return city ? `${prefecture}${city}` : prefecture;
}
