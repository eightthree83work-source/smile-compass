import { calculateLoanRepayment } from "./calculations";
import { Property } from "./types";

// ---------------------------------------------------------------------------
// 返済負担率（年間ローン返済額 ÷ 世帯年収 × 100）に基づく目安コメント
// ---------------------------------------------------------------------------

/** この値未満なら「comfortable」（家計にかなり余裕がある水準） */
export const REPAYMENT_BURDEN_COMFORTABLE_THRESHOLD_PERCENT = 20;
/** この値未満なら「reasonable」（無理のない返済水準の目安） */
export const REPAYMENT_BURDEN_REASONABLE_THRESHOLD_PERCENT = 25;
/** この値以下なら「caution」、これを超えると「risk」（一般的な金融機関の審査基準に近い水準） */
export const REPAYMENT_BURDEN_CAUTION_THRESHOLD_PERCENT = 35;

export type RepaymentBurdenLevel = "comfortable" | "reasonable" | "caution" | "risk";

export const REPAYMENT_BURDEN_COMMENTS: Record<RepaymentBurdenLevel, string> = {
  comfortable: "家計にかなり余裕のある返済水準です",
  reasonable: "無理のない返済水準の目安です",
  caution: "やや負担が大きく、他の支出とのバランスに注意が必要です",
  risk: "一般的な金融機関の審査基準（フラット35で年収400万円未満は30%以下、400万円以上は35%以下が目安）に近く、融資が通りにくい可能性や、生活を圧迫するリスクがあります",
};

/** REPAYMENT_BURDEN_COMMENTSと同じ区分を、FPのリスキャラのセリフ口調にリライトしたもの（診断サマリーの吹き出し表示用） */
export const REPAYMENT_BURDEN_CHARACTER_COMMENTS: Record<RepaymentBurdenLevel, string> = {
  comfortable: "この返済額なら、家計にかなり余裕がありそうだよ！",
  reasonable: "無理のない返済水準の目安だよ。安心して計画を進めていけそう。",
  caution: "やや負担が大きめかも。他の支出とのバランスも見直してみてね。",
  risk: "この負担率だと、金融機関の審査が通りにくいかも…。返済計画を見直すのがおすすめだよ。",
};

/** 世帯年収が未入力で返済負担率を診断できない場合に、リスキャラが入力を促すセリフ */
export const REPAYMENT_BURDEN_UNKNOWN_COMMENT = "世帯年収を入力すると、返済に無理がないか診断するよ！";

export const REPAYMENT_BURDEN_DISCLAIMER_TEXT =
  "これはあくまで一般的な目安であり、実際の融資審査結果を保証するものではありません。正式な判断は金融機関にご確認ください。";

export interface RepaymentBurdenAssessment {
  /** 返済負担率（%） */
  ratioPercent: number;
  level: RepaymentBurdenLevel;
  comment: string;
}

/**
 * 返済負担率（年間ローン返済額 ÷ 世帯年収 × 100）を計算し、水準に応じた目安コメントを返す。
 * 世帯年収が未入力（0以下）の場合や、借入がない場合はnullを返す。
 */
export function assessRepaymentBurden(property: Property): RepaymentBurdenAssessment | null {
  if (property.householdIncomeManYen <= 0) return null;

  const { monthlyPayment } = calculateLoanRepayment(property);
  if (monthlyPayment <= 0) return null;

  const annualPaymentYen = monthlyPayment * 12;
  const annualIncomeYen = property.householdIncomeManYen * 10000;
  const ratioPercent = (annualPaymentYen / annualIncomeYen) * 100;

  let level: RepaymentBurdenLevel;
  if (ratioPercent < REPAYMENT_BURDEN_COMFORTABLE_THRESHOLD_PERCENT) {
    level = "comfortable";
  } else if (ratioPercent < REPAYMENT_BURDEN_REASONABLE_THRESHOLD_PERCENT) {
    level = "reasonable";
  } else if (ratioPercent <= REPAYMENT_BURDEN_CAUTION_THRESHOLD_PERCENT) {
    level = "caution";
  } else {
    level = "risk";
  }

  return { ratioPercent, level, comment: REPAYMENT_BURDEN_COMMENTS[level] };
}
