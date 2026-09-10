import { ValuationJudgment } from "./valuation";

/**
 * シェアリンク（/share?d=...）とOGP画像生成（/api/share-image?d=...）の両方で使う、
 * 診断結果の要約データ。ブラウザ・サーバーの両方で使えるよう、依存はUTF-8/Base64URLのみに限定する。
 *
 * 金額（坪単価・月々返済額・生涯コスト・住宅ローン控除額）は、ユーザーが明示的に
 * 「金額を表示する」をONにした場合のみ含める。世帯年収はこの要約に含めない。
 */
export interface ShareSummary {
  v: 1;
  /** 所在地の表示用文字列（都道府県＋市区町村まで、または非公開表記）。呼び出し側で既に匿名化済みの値を渡す */
  loc: string;
  /** 診断日（表示用文字列） */
  date: string;
  /** 坪単価判定 */
  judgment: ValuationJudgment | null;
  /** 金額を表示するか */
  showAmounts: boolean;
  /** 坪単価（万円）。showAmounts=trueの場合のみ */
  pricePerTsubo?: number;
  /** 周辺相場の坪単価（万円）。showAmounts=trueの場合のみ */
  marketPricePerTsubo?: number;
  /** 月々返済額（円）。showAmounts=trueの場合のみ */
  monthlyPayment?: number;
  /** 生涯コストの目安（円）。showAmounts=trueの場合のみ */
  netLifetimeCost?: number;
  /** 住宅ローン控除の合計額（円）。showAmounts=trueの場合のみ */
  loanDeductionTotal?: number;
  /** 宅建士のチェックリスト該当件数 */
  legalCount: number;
  /** 住宅診断士のチェックリスト該当件数 */
  inspectionCount: number;
  /** 洪水浸水想定区域に該当するか（未取得の場合はunknown） */
  hazardFlood: HazardFlag;
  /** 土砂災害警戒区域に該当するか（未取得の場合はunknown） */
  hazardSediment: HazardFlag;
  /** 津波浸水想定に該当するか（未取得の場合はunknown） */
  hazardTsunami: HazardFlag;
}

export type HazardFlag = "yes" | "no" | "unknown";

function utf8ToBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUtf8(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShareSummary(summary: ShareSummary): string {
  return utf8ToBase64Url(JSON.stringify(summary));
}

export function decodeShareSummary(code: string): ShareSummary | null {
  try {
    const parsed: unknown = JSON.parse(base64UrlToUtf8(code));
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (record.v !== 1 || typeof record.loc !== "string" || typeof record.date !== "string") return null;

    return {
      v: 1,
      loc: record.loc,
      date: record.date,
      judgment:
        record.judgment === "undervalued" || record.judgment === "reasonable" || record.judgment === "overvalued"
          ? record.judgment
          : null,
      showAmounts: record.showAmounts === true,
      pricePerTsubo: typeof record.pricePerTsubo === "number" ? record.pricePerTsubo : undefined,
      marketPricePerTsubo: typeof record.marketPricePerTsubo === "number" ? record.marketPricePerTsubo : undefined,
      monthlyPayment: typeof record.monthlyPayment === "number" ? record.monthlyPayment : undefined,
      netLifetimeCost: typeof record.netLifetimeCost === "number" ? record.netLifetimeCost : undefined,
      loanDeductionTotal: typeof record.loanDeductionTotal === "number" ? record.loanDeductionTotal : undefined,
      legalCount: typeof record.legalCount === "number" ? record.legalCount : 0,
      inspectionCount: typeof record.inspectionCount === "number" ? record.inspectionCount : 0,
      hazardFlood: normalizeHazardFlag(record.hazardFlood),
      hazardSediment: normalizeHazardFlag(record.hazardSediment),
      hazardTsunami: normalizeHazardFlag(record.hazardTsunami),
    };
  } catch {
    return null;
  }
}

function normalizeHazardFlag(value: unknown): HazardFlag {
  return value === "yes" || value === "no" ? value : "unknown";
}
