"use client";

import CurrencyInput from "@/components/CurrencyInput";
import { Property, STRUCTURE_TYPE_OPTIONS, StructureType } from "@/lib/types";

export const INPUT_CLASS_NAME =
  "mt-1 block w-full rounded-md border border-ink/20 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const LABEL_CLASS_NAME = "block text-sm font-medium text-ink/80";
const CHECKBOX_CLASS_NAME = "h-4 w-4 rounded border-ink/25 text-accent focus:ring-accent";

type RequiredNumberKey =
  | "price"
  | "downPayment"
  | "interestRateAnnual"
  | "loanTermYears"
  | "floorAreaSqm"
  | "buildingAgeYears"
  | "householdIncomeManYen";

interface PropertyFormProps {
  value: Property;
  onChange: (next: Property) => void;
}

export default function PropertyForm({ value, onChange }: PropertyFormProps) {
  const updateField = <K extends keyof Property>(key: K, fieldValue: Property[K]) => {
    onChange({ ...value, [key]: fieldValue });
  };

  // 必須の数値項目用。0は「未入力」と同じ扱いにして、空にした時に表示が空欄のまま保てるようにする
  const requiredNumberProps = (key: RequiredNumberKey) => ({
    value: value[key] === 0 ? undefined : value[key],
    onChange: (next: number | undefined) => updateField(key, next ?? 0),
  });

  return (
    <form className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div>
        <label htmlFor="price" className={LABEL_CLASS_NAME}>
          価格（円）
        </label>
        <CurrencyInput id="price" className={INPUT_CLASS_NAME} {...requiredNumberProps("price")} />
      </div>

      <div>
        <label htmlFor="downPayment" className={LABEL_CLASS_NAME}>
          頭金（円）
        </label>
        <CurrencyInput id="downPayment" className={INPUT_CLASS_NAME} {...requiredNumberProps("downPayment")} />
      </div>

      <div>
        <label htmlFor="interestRateAnnual" className={LABEL_CLASS_NAME}>
          金利（年率 %）
        </label>
        <CurrencyInput
          id="interestRateAnnual"
          className={INPUT_CLASS_NAME}
          {...requiredNumberProps("interestRateAnnual")}
        />
      </div>

      <div>
        <label htmlFor="loanTermYears" className={LABEL_CLASS_NAME}>
          返済期間（年）
        </label>
        <CurrencyInput id="loanTermYears" className={INPUT_CLASS_NAME} {...requiredNumberProps("loanTermYears")} />
      </div>

      <div>
        <label htmlFor="floorAreaSqm" className={LABEL_CLASS_NAME}>
          床面積（㎡）
        </label>
        <CurrencyInput id="floorAreaSqm" className={INPUT_CLASS_NAME} {...requiredNumberProps("floorAreaSqm")} />
      </div>

      <div>
        <label htmlFor="buildingAgeYears" className={LABEL_CLASS_NAME}>
          築年数（年）
        </label>
        <CurrencyInput
          id="buildingAgeYears"
          className={INPUT_CLASS_NAME}
          {...requiredNumberProps("buildingAgeYears")}
        />
      </div>

      <div>
        <label htmlFor="structureType" className={LABEL_CLASS_NAME}>
          構造
        </label>
        <select
          id="structureType"
          className={INPUT_CLASS_NAME}
          value={value.structureType}
          onChange={(e) => updateField("structureType", e.target.value as StructureType)}
        >
          {STRUCTURE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <label htmlFor="hasSeismicCertificate" className="flex items-center gap-2 text-sm font-medium text-ink/80">
          <input
            id="hasSeismicCertificate"
            type="checkbox"
            className={CHECKBOX_CLASS_NAME}
            checked={value.hasSeismicCertificate}
            onChange={(e) => updateField("hasSeismicCertificate", e.target.checked)}
          />
          耐震基準適合証明書の有無
        </label>
      </div>

      <div className="flex items-end">
        <label
          htmlFor="hasEnergyEfficiencyCertificate"
          className="flex items-center gap-2 text-sm font-medium text-ink/80"
        >
          <input
            id="hasEnergyEfficiencyCertificate"
            type="checkbox"
            className={CHECKBOX_CLASS_NAME}
            checked={value.hasEnergyEfficiencyCertificate}
            onChange={(e) => updateField("hasEnergyEfficiencyCertificate", e.target.checked)}
          />
          省エネ性能等認定の有無
        </label>
      </div>

      <div>
        <label htmlFor="householdIncomeManYen" className={LABEL_CLASS_NAME}>
          世帯年収（万円）
        </label>
        <CurrencyInput
          id="householdIncomeManYen"
          className={INPUT_CLASS_NAME}
          {...requiredNumberProps("householdIncomeManYen")}
        />
      </div>

      <div>
        <label htmlFor="propertyTaxAnnualManYen" className={LABEL_CLASS_NAME}>
          固定資産税・都市計画税の年額（万円）
        </label>
        <CurrencyInput
          id="propertyTaxAnnualManYen"
          placeholder="未入力の場合は概算します"
          className={INPUT_CLASS_NAME}
          value={value.propertyTaxAnnualManYen}
          onChange={(next) => updateField("propertyTaxAnnualManYen", next)}
        />
      </div>

      <div>
        <label htmlFor="annualMaintenanceCostManYen" className={LABEL_CLASS_NAME}>
          年間維持費（万円）
        </label>
        <CurrencyInput
          id="annualMaintenanceCostManYen"
          placeholder="管理費・修繕積立金・保険料などの合計目安"
          className={INPUT_CLASS_NAME}
          value={value.annualMaintenanceCostManYen}
          onChange={(next) => updateField("annualMaintenanceCostManYen", next)}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="location" className={LABEL_CLASS_NAME}>
          所在地
        </label>
        <input
          id="location"
          type="text"
          placeholder="例：東京都世田谷区〇〇"
          className={INPUT_CLASS_NAME}
          value={value.location}
          onChange={(e) => updateField("location", e.target.value)}
        />
      </div>
    </form>
  );
}
