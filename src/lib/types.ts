export type StructureType = "wood" | "steel" | "rc" | "src" | "other";

export const STRUCTURE_TYPE_LABELS: Record<StructureType, string> = {
  wood: "木造",
  steel: "鉄骨造",
  rc: "鉄筋コンクリート造（RC）",
  src: "鉄骨鉄筋コンクリート造（SRC）",
  other: "その他",
};

export const STRUCTURE_TYPE_OPTIONS: { value: StructureType; label: string }[] = (
  Object.keys(STRUCTURE_TYPE_LABELS) as StructureType[]
).map((value) => ({ value, label: STRUCTURE_TYPE_LABELS[value] }));

export interface Property {
  /** 価格（円） */
  price: number;
  /** 頭金（円） */
  downPayment: number;
  /** 金利（年率 %） */
  interestRateAnnual: number;
  /** 返済期間（年） */
  loanTermYears: number;
  /** 床面積（㎡） */
  floorAreaSqm: number;
  /** 築年数（年） */
  buildingAgeYears: number;
  /** 構造 */
  structureType: StructureType;
  /** 耐震基準適合証明書の有無 */
  hasSeismicCertificate: boolean;
  /** 省エネ性能等認定の有無 */
  hasEnergyEfficiencyCertificate: boolean;
  /** 所在地 */
  location: string;
  /** 世帯年収（万円） */
  householdIncomeManYen: number;
  /** 固定資産税・都市計画税の年額（万円）。任意入力、未入力なら概算する */
  propertyTaxAnnualManYen?: number;
  /** 年間維持費（万円）。管理費・修繕積立金・保険料などの合計目安。任意入力、未入力なら0として扱う */
  annualMaintenanceCostManYen?: number;
  /** 敷地面積（坪）。任意入力、建物価格の目安試算にのみ使用 */
  landAreaTsubo?: number;
}

export function createDefaultProperty(): Property {
  return {
    price: 0,
    downPayment: 0,
    interestRateAnnual: 0,
    loanTermYears: 35,
    floorAreaSqm: 0,
    buildingAgeYears: 0,
    structureType: "wood",
    hasSeismicCertificate: false,
    hasEnergyEfficiencyCertificate: false,
    location: "",
    householdIncomeManYen: 0,
  };
}
