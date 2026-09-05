import { Property } from "./types";

const GENERAL_LOAN_LIMIT_MAN_YEN = 2000;
const ENERGY_EFFICIENT_LOAN_LIMIT_MAN_YEN = 3000;
const GENERAL_DEDUCTION_PERIOD_YEARS = 10;
const ENERGY_EFFICIENT_DEDUCTION_PERIOD_YEARS = 13;
const DEDUCTION_RATE = 0.007;
const NARROW_FLOOR_AREA_SQM = 40;
const STANDARD_FLOOR_AREA_SQM = 50;
const NARROW_FLOOR_AREA_INCOME_CAP_MAN_YEN = 1000;
/** 中古住宅が耐震基準を満たしたとみなされる新耐震基準の施行年 */
const OLD_HOME_STANDARD_YEAR = 1982;
/** 固定資産税評価額を物件価格から概算する際の割合 */
const PROPERTY_TAX_ASSESSED_VALUE_RATIO = 0.65;
/** 固定資産税・都市計画税の標準税率（概算用） */
const PROPERTY_TAX_STANDARD_RATE = 0.014;

// ---------------------------------------------------------------------------
// 元利均等返済
// ---------------------------------------------------------------------------

export interface LoanRepaymentResult {
  /** 借入元金（円） */
  loanPrincipal: number;
  /** 月々返済額（円） */
  monthlyPayment: number;
  /** 総返済額（円） */
  totalRepayment: number;
  /** 総利息（円） */
  totalInterest: number;
}

/** 物件価格・頭金から借入元金（円）を求める */
export function getLoanPrincipal(property: Property): number {
  return Math.max(property.price - property.downPayment, 0);
}

/** 元利均等返済の月々返済額・総返済額・総利息を計算する（借入元金・金利・返済期間を直接指定） */
export function calculateAmortizedLoan(loanPrincipal: number, annualRate: number, termYears: number): LoanRepaymentResult {
  const months = Math.round(termYears * 12);
  const monthlyRate = annualRate / 100 / 12;

  if (months <= 0 || loanPrincipal <= 0) {
    return { loanPrincipal, monthlyPayment: 0, totalRepayment: 0, totalInterest: 0 };
  }

  const monthlyPayment =
    monthlyRate === 0
      ? loanPrincipal / months
      : (loanPrincipal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

  const totalRepayment = monthlyPayment * months;
  const totalInterest = totalRepayment - loanPrincipal;

  return { loanPrincipal, monthlyPayment, totalRepayment, totalInterest };
}

export function calculateLoanRepayment(property: Property): LoanRepaymentResult {
  return calculateAmortizedLoan(getLoanPrincipal(property), property.interestRateAnnual, property.loanTermYears);
}

/** 元利均等返済における、返済開始から指定月数が経過した時点の残高（円） */
export function calculateRemainingBalance(
  principal: number,
  monthlyRate: number,
  monthlyPayment: number,
  monthsElapsed: number,
): number {
  if (monthsElapsed <= 0) return principal;

  const balance =
    monthlyRate === 0
      ? principal - monthlyPayment * monthsElapsed
      : principal * Math.pow(1 + monthlyRate, monthsElapsed) -
        monthlyPayment * ((Math.pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate);

  return Math.max(balance, 0);
}

// ---------------------------------------------------------------------------
// 固定金利 vs 変動金利（簡易シミュレーション）
// ---------------------------------------------------------------------------

export interface TwoPhaseLoanRepaymentResult {
  /** 金利切り替え前（返済期間の前半）の月々返済額（円） */
  monthlyPaymentBeforeSwitch: number;
  /** 金利切り替え後（返済期間の後半）の月々返済額（円） */
  monthlyPaymentAfterSwitch: number;
  /** 総返済額（円） */
  totalRepayment: number;
  /** 総利息（円） */
  totalInterest: number;
}

/**
 * 返済期間の半分が経過した時点で、金利がinitialAnnualRateからchangedAnnualRateへ切り替わる、
 * という簡易的な前提での2段階の元利均等返済シミュレーション。
 * 切り替え時点の残高を、残り期間・新金利で組み直した返済額に再計算する。
 */
export function calculateTwoPhaseLoanRepayment(
  loanPrincipal: number,
  loanTermYears: number,
  initialAnnualRate: number,
  changedAnnualRate: number,
): TwoPhaseLoanRepaymentResult {
  const totalMonths = Math.round(loanTermYears * 12);

  if (totalMonths <= 0 || loanPrincipal <= 0) {
    return { monthlyPaymentBeforeSwitch: 0, monthlyPaymentAfterSwitch: 0, totalRepayment: 0, totalInterest: 0 };
  }

  const monthsBeforeSwitch = Math.floor(totalMonths / 2);
  const monthsAfterSwitch = totalMonths - monthsBeforeSwitch;

  const beforeSwitch = calculateAmortizedLoan(loanPrincipal, initialAnnualRate, loanTermYears);
  const monthlyRateBeforeSwitch = initialAnnualRate / 100 / 12;
  const balanceAtSwitch = calculateRemainingBalance(
    loanPrincipal,
    monthlyRateBeforeSwitch,
    beforeSwitch.monthlyPayment,
    monthsBeforeSwitch,
  );

  const afterSwitch = calculateAmortizedLoan(balanceAtSwitch, changedAnnualRate, monthsAfterSwitch / 12);

  const totalRepayment = beforeSwitch.monthlyPayment * monthsBeforeSwitch + afterSwitch.monthlyPayment * monthsAfterSwitch;
  const totalInterest = totalRepayment - loanPrincipal;

  return {
    monthlyPaymentBeforeSwitch: beforeSwitch.monthlyPayment,
    monthlyPaymentAfterSwitch: afterSwitch.monthlyPayment,
    totalRepayment,
    totalInterest,
  };
}

// ---------------------------------------------------------------------------
// 中古住宅の耐震基準判定（住宅ローン控除・不動産取得税/登録免許税の軽減で共通）
// ---------------------------------------------------------------------------

/** 築1982年以降、または耐震基準適合証明書のいずれかを満たすか */
export function meetsOldHomeBuildingStandard(
  property: Property,
  currentYear: number = new Date().getFullYear(),
): boolean {
  const builtYear = currentYear - property.buildingAgeYears;
  return builtYear >= OLD_HOME_STANDARD_YEAR || property.hasSeismicCertificate;
}

/** 床面積要件（50㎡以上、または40㎡以上かつ世帯年収1000万円以下）を満たすか */
export function meetsFloorAreaRequirement(property: Property): boolean {
  if (property.floorAreaSqm >= STANDARD_FLOOR_AREA_SQM) return true;
  if (property.floorAreaSqm >= NARROW_FLOOR_AREA_SQM) {
    return property.householdIncomeManYen <= NARROW_FLOOR_AREA_INCOME_CAP_MAN_YEN;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 住宅ローン控除
// ---------------------------------------------------------------------------

export interface MortgageDeductionEligibility {
  eligible: boolean;
  meetsBuildingStandard: boolean;
  meetsFloorAreaRequirement: boolean;
  /** 借入限度額（万円） */
  loanLimitManYen: number;
  /** 控除期間（年） */
  deductionPeriodYears: number;
  /** 対象外の場合の理由 */
  reasons: string[];
}

export function getMortgageDeductionEligibility(
  property: Property,
  currentYear: number = new Date().getFullYear(),
): MortgageDeductionEligibility {
  const meetsBuildingStandard = meetsOldHomeBuildingStandard(property, currentYear);
  const meetsArea = meetsFloorAreaRequirement(property);

  const reasons: string[] = [];
  if (!meetsBuildingStandard) {
    reasons.push("築1982年以降、または耐震基準適合証明書のいずれも満たしていません");
  }
  if (!meetsArea) {
    reasons.push("床面積要件（50㎡以上、または40㎡以上かつ世帯年収1000万円以下）を満たしていません");
  }

  return {
    eligible: meetsBuildingStandard && meetsArea,
    meetsBuildingStandard,
    meetsFloorAreaRequirement: meetsArea,
    loanLimitManYen: property.hasEnergyEfficiencyCertificate
      ? ENERGY_EFFICIENT_LOAN_LIMIT_MAN_YEN
      : GENERAL_LOAN_LIMIT_MAN_YEN,
    deductionPeriodYears: property.hasEnergyEfficiencyCertificate
      ? ENERGY_EFFICIENT_DEDUCTION_PERIOD_YEARS
      : GENERAL_DEDUCTION_PERIOD_YEARS,
    reasons,
  };
}

export interface MortgageDeductionYear {
  /** 控除1年目を1とする年次 */
  year: number;
  /** 年末残高（円） */
  yearEndBalance: number;
  /** 控除対象額（年末残高と借入限度額のいずれか小さい方） */
  deductionBase: number;
  /** その年の控除額（円） */
  deductionAmount: number;
}

export interface MortgageDeductionSimulation {
  eligibility: MortgageDeductionEligibility;
  years: MortgageDeductionYear[];
  /** 控除額の合計（円） */
  totalDeduction: number;
}

export function simulateMortgageDeduction(
  property: Property,
  currentYear: number = new Date().getFullYear(),
): MortgageDeductionSimulation {
  const eligibility = getMortgageDeductionEligibility(property, currentYear);

  if (!eligibility.eligible) {
    return { eligibility, years: [], totalDeduction: 0 };
  }

  const { loanPrincipal, monthlyPayment } = calculateLoanRepayment(property);
  const monthlyRate = property.interestRateAnnual / 100 / 12;
  const loanTermMonths = Math.round(property.loanTermYears * 12);
  const loanLimitYen = eligibility.loanLimitManYen * 10000;

  const years: MortgageDeductionYear[] = [];
  let totalDeduction = 0;

  for (let year = 1; year <= eligibility.deductionPeriodYears; year++) {
    const monthsElapsed = year * 12;
    if (monthsElapsed > loanTermMonths) break; // 完済後は控除対象の残高がないため終了

    const yearEndBalance = calculateRemainingBalance(loanPrincipal, monthlyRate, monthlyPayment, monthsElapsed);
    const deductionBase = Math.min(yearEndBalance, loanLimitYen);
    const deductionAmount = Math.round(deductionBase * DEDUCTION_RATE);

    years.push({ year, yearEndBalance, deductionBase, deductionAmount });
    totalDeduction += deductionAmount;
  }

  return { eligibility, years, totalDeduction };
}

// ---------------------------------------------------------------------------
// 不動産取得税・登録免許税の軽減
// ---------------------------------------------------------------------------

export interface TaxReductionEligibility {
  eligible: boolean;
  reason: string;
}

/** 不動産取得税・登録免許税の軽減対象となるか（築1982年以降、または耐震基準適合証明書） */
export function getAcquisitionAndRegistrationTaxReduction(
  property: Property,
  currentYear: number = new Date().getFullYear(),
): TaxReductionEligibility {
  const eligible = meetsOldHomeBuildingStandard(property, currentYear);
  return {
    eligible,
    reason: eligible
      ? "築1982年以降、または耐震基準適合証明書により軽減の対象です"
      : "築1982年以降でなく、耐震基準適合証明書もないため軽減の対象外です",
  };
}

// ---------------------------------------------------------------------------
// 固定資産税・都市計画税、維持費
// ---------------------------------------------------------------------------

export interface PropertyTaxEstimate {
  /** 固定資産税・都市計画税の年額（万円） */
  annualManYen: number;
  /** 未入力のため概算した値かどうか */
  isEstimated: boolean;
}

/**
 * 固定資産税・都市計画税の年額（万円）。
 * 入力済みならその値を、未入力なら「物件価格 × 0.65（評価額の概算割合）× 1.4%（標準税率）」で概算する。
 */
export function estimatePropertyTaxAnnual(property: Property): PropertyTaxEstimate {
  if (property.propertyTaxAnnualManYen !== undefined) {
    return { annualManYen: property.propertyTaxAnnualManYen, isEstimated: false };
  }

  const assessedValueYen = property.price * PROPERTY_TAX_ASSESSED_VALUE_RATIO;
  const annualYen = assessedValueYen * PROPERTY_TAX_STANDARD_RATE;
  return { annualManYen: annualYen / 10000, isEstimated: true };
}

/** 年間維持費（万円）。未入力なら0として扱う（物件ごとの差が大きく、無理に概算しない） */
export function getAnnualMaintenanceCostManYen(property: Property): number {
  return property.annualMaintenanceCostManYen ?? 0;
}

export interface HoldingPeriodCosts {
  /** 固定資産税・都市計画税の保有期間中の合計（円） */
  totalPropertyTaxYen: number;
  /** 固定資産税・都市計画税が概算値かどうか */
  isPropertyTaxEstimated: boolean;
  /** 維持費の保有期間中の合計（円） */
  totalMaintenanceCostYen: number;
}

/**
 * 固定資産税等・維持費の保有期間中の合計（年額 × 年数）。
 * 保有期間の目安として、返済期間（loanTermYears）の年数を用いる。
 */
export function calculateHoldingPeriodCosts(property: Property): HoldingPeriodCosts {
  const propertyTax = estimatePropertyTaxAnnual(property);
  const maintenanceAnnualManYen = getAnnualMaintenanceCostManYen(property);
  const holdingYears = property.loanTermYears;

  return {
    totalPropertyTaxYen: propertyTax.annualManYen * 10000 * holdingYears,
    isPropertyTaxEstimated: propertyTax.isEstimated,
    totalMaintenanceCostYen: maintenanceAnnualManYen * 10000 * holdingYears,
  };
}

// ---------------------------------------------------------------------------
// 生涯コストの目安
// ---------------------------------------------------------------------------

export interface LifetimeCostEstimate {
  /** 総返済額（円） */
  totalRepayment: number;
  /** 住宅ローン控除の合計額（円） */
  totalMortgageDeduction: number;
  /** 固定資産税・都市計画税の保有期間中の合計（円） */
  totalPropertyTax: number;
  /** 固定資産税・都市計画税が概算値かどうか */
  isPropertyTaxEstimated: boolean;
  /** 維持費の保有期間中の合計（円） */
  totalMaintenanceCost: number;
  /** 総返済額 − 住宅ローン控除 + 固定資産税等 + 維持費 で求める実質負担額 */
  netLifetimeCost: number;
}

export function calculateLifetimeCostEstimate(
  property: Property,
  currentYear: number = new Date().getFullYear(),
): LifetimeCostEstimate {
  const { totalRepayment } = calculateLoanRepayment(property);
  const { totalDeduction } = simulateMortgageDeduction(property, currentYear);
  const { totalPropertyTaxYen, isPropertyTaxEstimated, totalMaintenanceCostYen } =
    calculateHoldingPeriodCosts(property);

  return {
    totalRepayment,
    totalMortgageDeduction: totalDeduction,
    totalPropertyTax: totalPropertyTaxYen,
    isPropertyTaxEstimated,
    totalMaintenanceCost: totalMaintenanceCostYen,
    netLifetimeCost: totalRepayment - totalDeduction + totalPropertyTaxYen + totalMaintenanceCostYen,
  };
}
