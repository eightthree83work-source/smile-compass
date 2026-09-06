"use client";

import BuildingAgeInput from "@/components/BuildingAgeInput";
import CurrencyInput from "@/components/CurrencyInput";
import FloorAreaInput from "@/components/FloorAreaInput";
import InfoTooltip from "@/components/InfoTooltip";
import LandAreaInput from "@/components/LandAreaInput";
import { estimatePropertyTaxAnnual, getAnnualMaintenanceCostManYen } from "@/lib/calculations";
import { Property, STRUCTURE_TYPE_OPTIONS, StructureType } from "@/lib/types";

export const INPUT_CLASS_NAME =
  "mt-1 block w-full rounded-md border border-ink/20 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const LABEL_CLASS_NAME = "block text-sm font-medium text-ink/80";
const CHECKBOX_CLASS_NAME = "h-4 w-4 rounded border-ink/25 text-accent focus:ring-accent";

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
}

const PROPERTY_TAX_TOOLTIP_TEXT =
  "入力済みの場合はその金額を使用します。未入力の場合は「物件価格 × 65%（固定資産税評価額の概算割合）× 1.4%（標準税率）」で概算しています。実際の税額は自治体の評価額により異なります。";

const MAINTENANCE_COST_TOOLTIP_TEXT =
  "入力済みの場合はその金額を使用します。未入力の場合は「延床面積（㎡） × 2,000円 × 構造係数 × 築年数係数」で概算しています。構造係数は木造1.0・鉄骨造1.15・RC造（SRC造含む）1.3・その他1.0、築年数係数は0〜10年0.7・11〜20年1.0・21〜30年1.3・31年以上1.6です。延床面積・構造・築年数から算出した目安であり、地域差は反映していません。";

const SEISMIC_CERTIFICATE_TOOLTIP_TEXT =
  "住宅ローン控除の要件に関わります。建築年が1982年（昭和57年）以降の住宅は、このチェックの有無に関わらず自動的に要件を満たします。1981年以前の住宅では、この証明書がないと住宅ローン控除の対象外になります。";

const ENERGY_EFFICIENCY_CERTIFICATE_TOOLTIP_TEXT =
  "住宅ローン控除の借入限度額に関わります。認定長期優良住宅・認定低炭素住宅・ZEH水準省エネ住宅・省エネ基準適合住宅などの認定がある場合、借入限度額が2,000万円→3,000万円に上がり、控除額が増える可能性があります（控除率0.7%・控除期間10年は変わりません）。";

type RequiredNumberKey = "price" | "downPayment" | "interestRateAnnual" | "loanTermYears" | "householdIncomeManYen";

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
        <FloorAreaInput
          id="floorAreaSqm"
          className={INPUT_CLASS_NAME}
          labelClassName={LABEL_CLASS_NAME}
          valueSqm={value.floorAreaSqm}
          onChangeSqm={(next) => updateField("floorAreaSqm", next)}
        />
      </div>

      <div>
        <LandAreaInput
          id="landAreaTsubo"
          className={INPUT_CLASS_NAME}
          labelClassName={LABEL_CLASS_NAME}
          placeholder="不動産プロのサポートの建物価格試算に使用"
          valueTsubo={value.landAreaTsubo}
          onChangeTsubo={(next) => updateField("landAreaTsubo", next)}
        />
      </div>

      <div>
        <BuildingAgeInput
          id="buildingAgeYears"
          className={INPUT_CLASS_NAME}
          labelClassName={LABEL_CLASS_NAME}
          valueYears={value.buildingAgeYears}
          onChangeYears={(next) => updateField("buildingAgeYears", next)}
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
        <InfoTooltip text={SEISMIC_CERTIFICATE_TOOLTIP_TEXT} />
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
        <InfoTooltip text={ENERGY_EFFICIENCY_CERTIFICATE_TOOLTIP_TEXT} />
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
        <div className="flex items-center gap-1">
          <label htmlFor="propertyTaxAnnualManYen" className={LABEL_CLASS_NAME}>
            固定資産税・都市計画税の年額（万円）
          </label>
          <InfoTooltip text={PROPERTY_TAX_TOOLTIP_TEXT} />
        </div>
        <CurrencyInput
          id="propertyTaxAnnualManYen"
          placeholder="未入力の場合は概算します"
          className={INPUT_CLASS_NAME}
          value={value.propertyTaxAnnualManYen}
          onChange={(next) => updateField("propertyTaxAnnualManYen", next)}
        />
        {value.propertyTaxAnnualManYen === undefined && value.price > 0 && (
          <p className="mt-1 text-xs text-ink/40">
            概算 {formatYen(estimatePropertyTaxAnnual(value).annualManYen * 10000)}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center gap-1">
          <label htmlFor="annualMaintenanceCostManYen" className={LABEL_CLASS_NAME}>
            年間維持費（万円）
          </label>
          <InfoTooltip text={MAINTENANCE_COST_TOOLTIP_TEXT} />
        </div>
        <CurrencyInput
          id="annualMaintenanceCostManYen"
          placeholder="管理費・修繕積立金・保険料などの合計目安"
          className={INPUT_CLASS_NAME}
          value={value.annualMaintenanceCostManYen}
          onChange={(next) => updateField("annualMaintenanceCostManYen", next)}
        />
        {value.annualMaintenanceCostManYen === undefined && value.floorAreaSqm > 0 && (
          <p className="mt-1 text-xs text-ink/40">
            概算 {formatYen(getAnnualMaintenanceCostManYen(value) * 10000)}
          </p>
        )}
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
