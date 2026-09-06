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

// ---------------------------------------------------------------------------
// 建物価格の目安試算
// ---------------------------------------------------------------------------

/** 「試算上の建物価格」がこの金額（円）以上あれば、割安感がある目安として扱う */
const BUILDING_PRICE_UNDERVALUED_THRESHOLD_YEN = 3_000_000;

export interface BuildingPriceEstimate {
  /** 試算上の建物価格（円）。物件価格 − 敷地の試算価格 */
  estimatedBuildingPriceYen: number;
  /** 敷地の試算価格（円）。敷地面積（坪） × 周辺相場の坪単価 */
  estimatedLandPriceYen: number;
  /** 試算上の建物価格が一定額以上あり、割安感の目安となるかどうか */
  looksUndervalued: boolean;
}

/**
 * 物件価格から、敷地面積・周辺相場の坪単価をもとに試算した敷地価格を差し引き、
 * 「試算上の建物価格」を求める（土地値を除いた、建物にかかっているとみなせる価格の目安）。
 * 試算上の建物価格 = 物件価格 −（敷地面積[坪] × 周辺相場の坪単価[万円→円]）
 * 物件価格・敷地面積・周辺相場の坪単価のいずれかが未入力の場合はnullを返す。
 */
export function estimateBuildingPrice(
  property: Property,
  marketPricePerTsuboManYen: number,
): BuildingPriceEstimate | null {
  if (property.price <= 0 || !property.landAreaTsubo || property.landAreaTsubo <= 0 || marketPricePerTsuboManYen <= 0) {
    return null;
  }

  const estimatedLandPriceYen = property.landAreaTsubo * marketPricePerTsuboManYen * 10000;
  const estimatedBuildingPriceYen = property.price - estimatedLandPriceYen;

  return {
    estimatedBuildingPriceYen,
    estimatedLandPriceYen,
    looksUndervalued: estimatedBuildingPriceYen >= BUILDING_PRICE_UNDERVALUED_THRESHOLD_YEN,
  };
}
