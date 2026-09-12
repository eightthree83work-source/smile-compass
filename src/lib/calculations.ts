import { Property, StructureType } from "./types";

/** 借入限度額（万円）。中古住宅の場合、認定住宅等（認定長期優良住宅・認定低炭素住宅・ZEH水準省エネ住宅・省エネ基準適合住宅）以外 */
const GENERAL_LOAN_LIMIT_MAN_YEN = 2000;
/** 借入限度額（万円）。中古住宅で認定住宅等（省エネ性能等認定あり）の場合 */
const ENERGY_EFFICIENT_LOAN_LIMIT_MAN_YEN = 3000;
/** 控除期間（年）。中古住宅は認定の有無によらず一律10年（新築住宅向けの13年特例は中古住宅には適用されない） */
const DEDUCTION_PERIOD_YEARS = 10;
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
/** 年間維持費の概算に使う、延床面積あたりの基準単価（円/㎡） */
const MAINTENANCE_COST_PER_SQM_YEN = 2000;
/** 年間維持費の概算に使う構造係数（SRCはRCと同じ耐用年数区分のためRCと同値とする） */
const MAINTENANCE_COST_STRUCTURE_FACTORS: Record<StructureType, number> = {
  wood: 1.0,
  steel: 1.15,
  rc: 1.3,
  src: 1.3,
  other: 1.0,
};

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

export interface AmortizationYearPoint {
  /** 返済1年目を1とする年次 */
  year: number;
  /** その年に返済した元金部分（円） */
  principalPaid: number;
  /** その年に返済した利息部分（円） */
  interestPaid: number;
  /** その年の返済額合計（円） */
  totalPaid: number;
  /** その年末時点の残高（円） */
  endBalance: number;
  /** 開始からその年末までの累計返済額（円） */
  cumulativeRepayment: number;
}

/** 元利均等返済の年別内訳（元金・利息・年末残高・累計返済額）を1年ごとに生成する */
export function generateAmortizationSchedule(
  loanPrincipal: number,
  annualRate: number,
  termYears: number,
): AmortizationYearPoint[] {
  const totalMonths = Math.round(termYears * 12);
  if (totalMonths <= 0 || loanPrincipal <= 0) return [];

  const monthlyRate = annualRate / 100 / 12;
  const { monthlyPayment } = calculateAmortizedLoan(loanPrincipal, annualRate, termYears);
  const years = Math.ceil(totalMonths / 12);

  const points: AmortizationYearPoint[] = [];
  let cumulativeRepayment = 0;

  for (let year = 1; year <= years; year++) {
    const monthsElapsedStart = Math.min((year - 1) * 12, totalMonths);
    const monthsElapsedEnd = Math.min(year * 12, totalMonths);
    const startBalance = calculateRemainingBalance(loanPrincipal, monthlyRate, monthlyPayment, monthsElapsedStart);
    const endBalance = calculateRemainingBalance(loanPrincipal, monthlyRate, monthlyPayment, monthsElapsedEnd);
    const totalPaid = monthlyPayment * (monthsElapsedEnd - monthsElapsedStart);
    const principalPaid = startBalance - endBalance;
    const interestPaid = totalPaid - principalPaid;

    cumulativeRepayment += totalPaid;
    points.push({ year, principalPaid, interestPaid, totalPaid, endBalance, cumulativeRepayment });
  }

  return points;
}

// ---------------------------------------------------------------------------
// 固定金利 vs 変動金利（多段階の金利上昇シミュレーション）
// ---------------------------------------------------------------------------

export interface RateChangeEvent {
  /** 借入から何年経過した時点で金利が変わるか（例: 5なら5年経過時点＝60ヶ月経過時点） */
  afterYears: number;
  /** 変更後の年率（%、絶対値） */
  newRateAnnual: number;
}

interface RatePhase {
  startMonth: number;
  endMonth: number;
  annualRate: number;
  monthlyPayment: number;
  startBalance: number;
}

/**
 * 金利変更イベント列から、各フェーズ（開始月・終了月・適用金利・月々返済額・開始時残高）を組み立てる。
 * 金利が変わるたびに、その時点の残高を残り期間・新金利で組み直す（フルアモチゼーション方式）。
 * afterYearsが返済期間を超える、または0以下のイベントは無視する。同じ年に複数指定された場合は
 * afterYears昇順で処理され、最後に適用されたものが有効になる。
 */
function computeRatePhases(
  loanPrincipal: number,
  totalMonths: number,
  initialAnnualRate: number,
  rateChanges: RateChangeEvent[],
): RatePhase[] {
  const sortedChanges = [...rateChanges]
    .filter((change) => change.afterYears > 0 && change.afterYears * 12 < totalMonths)
    .sort((a, b) => a.afterYears - b.afterYears);

  const boundaries: { switchMonth: number; annualRate: number }[] = [];
  let cursorMonth = 0;
  let currentRate = initialAnnualRate;
  for (const change of sortedChanges) {
    const switchMonth = change.afterYears * 12;
    if (switchMonth <= cursorMonth) continue; // 同じ月への重複指定は無視（直前の値のまま）
    boundaries.push({ switchMonth, annualRate: currentRate });
    cursorMonth = switchMonth;
    currentRate = change.newRateAnnual;
  }
  boundaries.push({ switchMonth: totalMonths, annualRate: currentRate });

  let balance = loanPrincipal;
  let previousBoundary = 0;
  const phases: RatePhase[] = [];
  for (const boundary of boundaries) {
    // 月々返済額は「このフェーズの残り期間」ではなく「借入全体の残り期間（このフェーズの開始から完済まで）」で
    // 組み直す。次に金利が変わるまでの期間だけで組むと、将来の変更を前提にした返済額になってしまうため、
    // 常に「今の金利がこのまま続く前提」で残り期間全体を再アモチゼーションする（実際の変動金利ローンと同じ考え方）。
    const monthCount = boundary.switchMonth - previousBoundary;
    const remainingMonths = totalMonths - previousBoundary;
    const { monthlyPayment } = calculateAmortizedLoan(balance, boundary.annualRate, remainingMonths / 12);
    const startBalance = balance;
    const monthlyRate = boundary.annualRate / 100 / 12;
    balance = calculateRemainingBalance(balance, monthlyRate, monthlyPayment, monthCount);
    phases.push({
      startMonth: previousBoundary,
      endMonth: boundary.switchMonth,
      annualRate: boundary.annualRate,
      monthlyPayment,
      startBalance,
    });
    previousBoundary = boundary.switchMonth;
  }

  return phases;
}

/**
 * 複数回の金利変更（多段階の変動金利シナリオ）に対応した年別内訳
 * （元金・利息・年末残高・累計返済額）を1年ごとに生成する。
 * rateChangesが空の場合は単一金利のスケジュールと同じ結果になる。
 */
export function generateMultiPhaseAmortizationSchedule(
  loanPrincipal: number,
  loanTermYears: number,
  initialAnnualRate: number,
  rateChanges: RateChangeEvent[],
): AmortizationYearPoint[] {
  const totalMonths = Math.round(loanTermYears * 12);
  if (totalMonths <= 0 || loanPrincipal <= 0) return [];

  const phases = computeRatePhases(loanPrincipal, totalMonths, initialAnnualRate, rateChanges);

  const findPhase = (monthsElapsed: number): RatePhase =>
    phases.find((phase) => monthsElapsed <= phase.endMonth) ?? phases[phases.length - 1];

  const balanceAtMonth = (monthsElapsed: number): number => {
    if (monthsElapsed <= 0) return loanPrincipal;
    const phase = findPhase(monthsElapsed);
    const monthlyRate = phase.annualRate / 100 / 12;
    return calculateRemainingBalance(phase.startBalance, monthlyRate, phase.monthlyPayment, monthsElapsed - phase.startMonth);
  };

  const paymentBetween = (monthStart: number, monthEnd: number): number => {
    let total = 0;
    for (const phase of phases) {
      const overlapStart = Math.max(monthStart, phase.startMonth);
      const overlapEnd = Math.min(monthEnd, phase.endMonth);
      if (overlapEnd > overlapStart) {
        total += (overlapEnd - overlapStart) * phase.monthlyPayment;
      }
    }
    return total;
  };

  const years = Math.ceil(totalMonths / 12);
  const points: AmortizationYearPoint[] = [];
  let cumulativeRepayment = 0;

  for (let year = 1; year <= years; year++) {
    const monthsElapsedStart = Math.min((year - 1) * 12, totalMonths);
    const monthsElapsedEnd = Math.min(year * 12, totalMonths);
    const startBalance = balanceAtMonth(monthsElapsedStart);
    const endBalance = balanceAtMonth(monthsElapsedEnd);
    const totalPaid = paymentBetween(monthsElapsedStart, monthsElapsedEnd);
    const principalPaid = startBalance - endBalance;
    const interestPaid = totalPaid - principalPaid;

    cumulativeRepayment += totalPaid;
    points.push({ year, principalPaid, interestPaid, totalPaid, endBalance, cumulativeRepayment });
  }

  return points;
}

export interface MultiPhaseLoanPhaseSummary {
  /** このフェーズが始まる年次（1年目を1とする） */
  startYear: number;
  /** このフェーズの月々返済額（円） */
  monthlyPayment: number;
  /** このフェーズで適用される年率（%） */
  annualRate: number;
}

export interface MultiPhaseLoanSummary {
  phases: MultiPhaseLoanPhaseSummary[];
  /** 総返済額（円） */
  totalRepayment: number;
  /** 総利息（円） */
  totalInterest: number;
}

/** 多段階の金利上昇シナリオの、フェーズごとの月々返済額・総返済額・総利息のサマリーを求める */
export function summarizeMultiPhaseLoan(
  loanPrincipal: number,
  loanTermYears: number,
  initialAnnualRate: number,
  rateChanges: RateChangeEvent[],
): MultiPhaseLoanSummary {
  const totalMonths = Math.round(loanTermYears * 12);
  if (totalMonths <= 0 || loanPrincipal <= 0) {
    return { phases: [], totalRepayment: 0, totalInterest: 0 };
  }

  const phases = computeRatePhases(loanPrincipal, totalMonths, initialAnnualRate, rateChanges);
  const totalRepayment = phases.reduce((sum, phase) => sum + phase.monthlyPayment * (phase.endMonth - phase.startMonth), 0);

  return {
    phases: phases.map((phase) => ({
      startYear: Math.floor(phase.startMonth / 12) + 1,
      monthlyPayment: phase.monthlyPayment,
      annualRate: phase.annualRate,
    })),
    totalRepayment,
    totalInterest: totalRepayment - loanPrincipal,
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
    // 中古住宅は認定住宅等かどうかによらず控除期間は一律10年（新築住宅向けの13年特例は対象外）
    deductionPeriodYears: DEDUCTION_PERIOD_YEARS,
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

/**
 * 変動金利の上昇シナリオ（多段階の金利変更）を前提とした住宅ローン控除のシミュレーション。
 * simulateMortgageDeductionと同じロジックだが、年末残高を単一金利のcalculateRemainingBalanceではなく
 * generateMultiPhaseAmortizationScheduleの多段階スケジュールから取得する点のみが異なる。
 */
export function simulateMultiPhaseMortgageDeduction(
  property: Property,
  initialAnnualRate: number,
  rateChangeEvents: RateChangeEvent[],
  currentYear: number = new Date().getFullYear(),
): MortgageDeductionSimulation {
  const eligibility = getMortgageDeductionEligibility(property, currentYear);

  if (!eligibility.eligible) {
    return { eligibility, years: [], totalDeduction: 0 };
  }

  const loanPrincipal = getLoanPrincipal(property);
  const loanLimitYen = eligibility.loanLimitManYen * 10000;
  const schedule = generateMultiPhaseAmortizationSchedule(
    loanPrincipal,
    property.loanTermYears,
    initialAnnualRate,
    rateChangeEvents,
  );

  const years: MortgageDeductionYear[] = [];
  let totalDeduction = 0;

  for (let year = 1; year <= eligibility.deductionPeriodYears; year++) {
    const point = schedule[year - 1];
    if (!point) break; // 完済後は控除対象の残高がないため終了

    const deductionBase = Math.min(point.endBalance, loanLimitYen);
    const deductionAmount = Math.round(deductionBase * DEDUCTION_RATE);

    years.push({ year, yearEndBalance: point.endBalance, deductionBase, deductionAmount });
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

/** 年間維持費の概算に使う築年数係数。0（未入力）は11〜20年と同じ1.0として扱う */
function getMaintenanceCostBuildingAgeFactor(buildingAgeYears: number): number {
  if (buildingAgeYears === 0) return 1.0;
  if (buildingAgeYears <= 10) return 0.7;
  if (buildingAgeYears <= 20) return 1.0;
  if (buildingAgeYears <= 30) return 1.3;
  return 1.6;
}

/**
 * 年間維持費（万円）。
 * 入力済みならその値を、未入力なら「延床面積（㎡） × 2,000円 × 構造係数 × 築年数係数」で概算する。
 */
export function getAnnualMaintenanceCostManYen(property: Property): number {
  if (property.annualMaintenanceCostManYen !== undefined) {
    return property.annualMaintenanceCostManYen;
  }

  const structureFactor = MAINTENANCE_COST_STRUCTURE_FACTORS[property.structureType];
  const buildingAgeFactor = getMaintenanceCostBuildingAgeFactor(property.buildingAgeYears);
  const annualYen = property.floorAreaSqm * MAINTENANCE_COST_PER_SQM_YEN * structureFactor * buildingAgeFactor;
  return annualYen / 10000;
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
 * 固定資産税等・維持費の保有期間中の合計。
 * 保有期間の目安として返済期間（loanTermYears）の年数を用い、generateLifetimeExpenseTimelineの
 * 年別内訳を合算する（維持費は築年数の経過に応じて年々係数が変わるため、単純な「年額 × 年数」ではなく
 * 年別の実額を積み上げる。こうすることでライフタイム支出タイムラインの累計と必ず一致する）。
 */
export function calculateHoldingPeriodCosts(property: Property): HoldingPeriodCosts {
  const propertyTax = estimatePropertyTaxAnnual(property);
  const timeline = generateLifetimeExpenseTimeline(property);

  return {
    totalPropertyTaxYen: timeline.reduce((sum, point) => sum + point.propertyTaxYen, 0),
    isPropertyTaxEstimated: propertyTax.isEstimated,
    totalMaintenanceCostYen: timeline.reduce((sum, point) => sum + point.maintenanceCostYen, 0),
  };
}

export interface LifetimeExpenseYearPoint {
  /** 購入から何年目か（1年目〜） */
  year: number;
  /** その年の住宅ローン返済額（円） */
  loanPaymentYen: number;
  /** その年の固定資産税・都市計画税（円） */
  propertyTaxYen: number;
  /** その年の維持費（円） */
  maintenanceCostYen: number;
  /** その年に適用される維持費の築年数係数 */
  maintenanceCostFactor: number;
  /** 維持費が未入力のため、築年数係数を使って概算しているかどうか */
  isMaintenanceCostEstimated: boolean;
}

/**
 * 購入からの経過年数ごとの支出（住宅ローン返済額・固定資産税等・維持費）を、
 * 保有期間の目安として返済期間（loanTermYears）分生成する。
 * 維持費が未入力（概算）の場合、年を追うごとに築年数が進み、築年数係数の変化に応じて支出が変わる。
 * 維持費が入力済みの場合は、その金額を毎年一定として扱う。
 */
export function generateLifetimeExpenseTimeline(property: Property): LifetimeExpenseYearPoint[] {
  const loanSchedule = generateAmortizationSchedule(
    getLoanPrincipal(property),
    property.interestRateAnnual,
    property.loanTermYears,
  );
  const propertyTaxYen = estimatePropertyTaxAnnual(property).annualManYen * 10000;
  const structureFactor = MAINTENANCE_COST_STRUCTURE_FACTORS[property.structureType];
  const isMaintenanceCostEstimated = property.annualMaintenanceCostManYen === undefined;
  const fixedMaintenanceCostYen = (property.annualMaintenanceCostManYen ?? 0) * 10000;

  const holdingYears = property.loanTermYears;
  const points: LifetimeExpenseYearPoint[] = [];

  for (let year = 1; year <= holdingYears; year++) {
    const loanPaymentYen = loanSchedule[year - 1]?.totalPaid ?? 0;
    const maintenanceCostFactor = getMaintenanceCostBuildingAgeFactor(property.buildingAgeYears + year - 1);
    const maintenanceCostYen = isMaintenanceCostEstimated
      ? property.floorAreaSqm * MAINTENANCE_COST_PER_SQM_YEN * structureFactor * maintenanceCostFactor
      : fixedMaintenanceCostYen;

    points.push({
      year,
      loanPaymentYen,
      propertyTaxYen,
      maintenanceCostYen,
      maintenanceCostFactor,
      isMaintenanceCostEstimated,
    });
  }

  return points;
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

/**
 * 変動金利の上昇シナリオを前提とした生涯コストの目安。固定資産税等・維持費は金利によらないため
 * calculateHoldingPeriodCosts（単一金利版と共通）をそのまま使い、総返済額・住宅ローン控除のみ
 * 多段階金利のスケジュール（summarizeMultiPhaseLoan・simulateMultiPhaseMortgageDeduction）で求める。
 */
export function calculateMultiPhaseLifetimeCostEstimate(
  property: Property,
  initialAnnualRate: number,
  rateChangeEvents: RateChangeEvent[],
  currentYear: number = new Date().getFullYear(),
): LifetimeCostEstimate {
  const loanPrincipal = getLoanPrincipal(property);
  const { totalRepayment } = summarizeMultiPhaseLoan(loanPrincipal, property.loanTermYears, initialAnnualRate, rateChangeEvents);
  const { totalDeduction } = simulateMultiPhaseMortgageDeduction(property, initialAnnualRate, rateChangeEvents, currentYear);
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

// ---------------------------------------------------------------------------
// 固定金利 vs 変動金利シナリオの採用結果（診断サマリーカードとの連携用）
// ---------------------------------------------------------------------------

export type LoanScenarioKind = "fixed" | "variableRising";

/**
 * FPのサポートタブで比較した固定金利・変動金利（上昇シナリオ）のうち、総返済額が少ない
 * 「最も有利」なほうの月々返済額・生涯コストの目安。物件カルテのDIAGNOSIS SUMMARYに反映する。
 */
export interface LoanScenarioSummary {
  mostAdvantageous: LoanScenarioKind;
  /** 採用したシナリオの月々返済額（円）。変動金利の場合は上昇前の初回の返済額 */
  monthlyPayment: number;
  netLifetimeCost: number;
}
