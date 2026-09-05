import { Property } from "./types";

/** 1坪あたりの平方メートル数 */
export const SQM_PER_TSUBO = 3.30578;

/** 割安・割高と判定する周辺相場からの乖離率のしきい値（%） */
const VALUATION_THRESHOLD_PERCENT = 5;

export type ValuationJudgment = "undervalued" | "reasonable" | "overvalued";

export const VALUATION_JUDGMENT_LABELS: Record<ValuationJudgment, string> = {
  undervalued: "割安",
  reasonable: "適正",
  overvalued: "割高",
};

export interface ValuationResult {
  /** 坪単価（万円） */
  pricePerTsuboManYen: number;
  /** 周辺相場との乖離率（%） */
  diffPercent: number;
  judgment: ValuationJudgment;
}

/** 価格と床面積から坪単価（万円）を計算する */
export function calculatePricePerTsuboManYen(property: Property): number | null {
  if (property.floorAreaSqm <= 0) return null;

  const tsubo = property.floorAreaSqm / SQM_PER_TSUBO;
  const pricePerTsuboYen = property.price / tsubo;
  return pricePerTsuboYen / 10000;
}

/** 自動計算した坪単価と周辺相場の坪単価を比較し、割安・適正・割高を判定する */
export function judgeValuation(
  pricePerTsuboManYen: number,
  marketPricePerTsuboManYen: number,
): ValuationResult | null {
  if (marketPricePerTsuboManYen <= 0) return null;

  const diffPercent =
    ((pricePerTsuboManYen - marketPricePerTsuboManYen) / marketPricePerTsuboManYen) * 100;

  let judgment: ValuationJudgment;
  if (diffPercent > VALUATION_THRESHOLD_PERCENT) {
    judgment = "overvalued";
  } else if (diffPercent < -VALUATION_THRESHOLD_PERCENT) {
    judgment = "undervalued";
  } else {
    judgment = "reasonable";
  }

  return { pricePerTsuboManYen, diffPercent, judgment };
}
