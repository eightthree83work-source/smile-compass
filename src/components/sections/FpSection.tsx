"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CurrencyInput from "@/components/CurrencyInput";
import { INPUT_CLASS_NAME } from "@/components/PropertyForm";
import { FpAdvisorIcon } from "@/components/icons/AdvisorIcons";
import { Property } from "@/lib/types";
import {
  calculateAmortizedLoan,
  calculateLifetimeCostEstimate,
  calculateLoanRepayment,
  calculateTwoPhaseLoanRepayment,
  getAcquisitionAndRegistrationTaxReduction,
  getLoanPrincipal,
  simulateMortgageDeduction,
} from "@/lib/calculations";

interface FpSectionProps {
  property: Property;
}

const MLIT_HOUSING_SUPPORT_SEARCH_URL =
  "https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk3_000055.html";

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
}

function StatTile({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="rounded-lg border border-ink/15 bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-ink/55">
        <span>{label}</span>
        {badge && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/60">{badge}</span>}
      </div>
      <div className="mt-1 font-heading text-2xl text-ink">{value}</div>
    </div>
  );
}

function RateInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink/80">
        {label}
      </label>
      <CurrencyInput
        id={id}
        className={INPUT_CLASS_NAME}
        value={value === 0 ? undefined : value}
        onChange={(next) => onChange(next ?? 0)}
      />
    </div>
  );
}

function EligibilityBadge({ eligible, label }: { eligible: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        eligible
          ? "border-[#0ca30c]/30 bg-[#0ca30c]/5 text-[#0b6b0b]"
          : "border-[#d03b3b]/30 bg-[#d03b3b]/5 text-[#a12f2f]"
      }`}
    >
      <span aria-hidden>{eligible ? "✓" : "✕"}</span>
      <span>{label}</span>
    </div>
  );
}

export default function FpSection({ property }: FpSectionProps) {
  const repayment = calculateLoanRepayment(property);
  const deduction = simulateMortgageDeduction(property);
  const taxReduction = getAcquisitionAndRegistrationTaxReduction(property);
  const lifetimeCost = calculateLifetimeCostEstimate(property);

  const chartData = deduction.years.map((y) => ({ year: y.year, deductionAmount: y.deductionAmount }));

  const trimmedLocation = property.location.trim();
  const localSubsidySearchUrl = trimmedLocation
    ? `https://www.google.com/search?q=${encodeURIComponent(`${trimmedLocation} 住宅購入 補助金`)}`
    : null;

  // 固定金利 vs 変動金利の比較用。初期値のみPropertyの現在の金利をコピーし、以降は独立して編集できる
  const [fixedRateAnnual, setFixedRateAnnual] = useState(() => property.interestRateAnnual);
  const [variableRateAnnual, setVariableRateAnnual] = useState(() => property.interestRateAnnual);
  const [futureRateAnnual, setFutureRateAnnual] = useState(() => property.interestRateAnnual + 1);

  const loanPrincipal = getLoanPrincipal(property);
  const fixedScenario = calculateAmortizedLoan(loanPrincipal, fixedRateAnnual, property.loanTermYears);
  const variableStableScenario = calculateAmortizedLoan(loanPrincipal, variableRateAnnual, property.loanTermYears);
  const variableRisingScenario = calculateTwoPhaseLoanRepayment(
    loanPrincipal,
    property.loanTermYears,
    variableRateAnnual,
    futureRateAnnual,
  );

  const rateScenarios = [
    {
      key: "fixed",
      label: "固定金利のまま",
      monthlyPaymentLabel: formatYen(fixedScenario.monthlyPayment),
      totalRepayment: fixedScenario.totalRepayment,
      totalInterest: fixedScenario.totalInterest,
    },
    {
      key: "variableStable",
      label: "変動金利が現状維持",
      monthlyPaymentLabel: formatYen(variableStableScenario.monthlyPayment),
      totalRepayment: variableStableScenario.totalRepayment,
      totalInterest: variableStableScenario.totalInterest,
    },
    {
      key: "variableRising",
      label: "変動金利が将来上昇",
      monthlyPaymentLabel: `前半 ${formatYen(variableRisingScenario.monthlyPaymentBeforeSwitch)} → 後半 ${formatYen(
        variableRisingScenario.monthlyPaymentAfterSwitch,
      )}`,
      totalRepayment: variableRisingScenario.totalRepayment,
      totalInterest: variableRisingScenario.totalInterest,
    },
  ];

  const mostAdvantageousKey = rateScenarios.reduce((best, current) =>
    current.totalRepayment < best.totalRepayment ? current : best,
  ).key;

  return (
    <section className="mt-8 space-y-8">
      <div className="flex items-center gap-3">
        <FpAdvisorIcon className="h-14 w-14 shrink-0 text-ink/70" />
        <h2 className="font-heading text-xl text-ink">FPの目</h2>
      </div>

      <div>
        <h3 className="font-heading text-lg text-ink">返済計画</h3>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="月々返済額" value={formatYen(repayment.monthlyPayment)} />
          <StatTile label="総返済額" value={formatYen(repayment.totalRepayment)} />
          <StatTile label="総利息" value={formatYen(repayment.totalInterest)} />
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg text-ink">固定金利 vs 変動金利</h3>
        <p className="mt-1 text-sm text-ink/55">
          借入額・返済期間は物件情報の値を使用します。「変動金利が将来上昇」は、返済期間の半分が経過した時点で金利が変動金利シナリオから将来上昇シナリオに切り替わるという簡易的な前提での試算です。実際の金利変動を予測するものではなく、あくまで目安としてご利用ください。
        </p>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RateInput
            id="fixedRateAnnual"
            label="固定金利シナリオ（年率 %）"
            value={fixedRateAnnual}
            onChange={setFixedRateAnnual}
          />
          <RateInput
            id="variableRateAnnual"
            label="変動金利シナリオ（当初年率 %）"
            value={variableRateAnnual}
            onChange={setVariableRateAnnual}
          />
          <RateInput
            id="futureRateAnnual"
            label="変動金利が将来上昇した場合の想定（年率 %）"
            value={futureRateAnnual}
            onChange={setFutureRateAnnual}
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-ink/15 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left text-ink/55">
                <th className="p-3 font-medium">シナリオ</th>
                <th className="p-3 font-medium">月々返済額</th>
                <th className="p-3 font-medium">総返済額</th>
                <th className="p-3 font-medium">総利息</th>
              </tr>
            </thead>
            <tbody>
              {rateScenarios.map((scenario) => (
                <tr key={scenario.key} className="border-b border-ink/10 last:border-0">
                  <td className="p-3 font-medium text-ink">
                    <div className="flex items-center gap-2">
                      <span>{scenario.label}</span>
                      {scenario.key === mostAdvantageousKey && (
                        <span className="rounded-full bg-[#0ca30c]/10 px-2 py-0.5 text-xs font-medium text-[#0b6b0b]">
                          最も有利
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-ink/70">{scenario.monthlyPaymentLabel}</td>
                  <td className="p-3 text-ink/70">{formatYen(scenario.totalRepayment)}</td>
                  <td className="p-3 text-ink/70">{formatYen(scenario.totalInterest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg text-ink">住宅ローン控除（年別）</h3>

        {!deduction.eligibility.eligible ? (
          <div className="mt-2 rounded-md border border-[#d03b3b]/30 bg-[#d03b3b]/5 p-4 text-sm text-[#a12f2f]">
            <p className="font-medium">住宅ローン控除の対象外です</p>
            <ul className="mt-1 list-disc pl-5">
              {deduction.eligibility.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink/55">
              借入限度額 {deduction.eligibility.loanLimitManYen.toLocaleString("ja-JP")}万円・控除期間{" "}
              {deduction.eligibility.deductionPeriodYears}年
            </p>
            <div className="mt-3 h-72 rounded-lg border border-ink/15 bg-background p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="#e1e0d9" />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(year) => `${year}年目`}
                    tick={{ fill: "#898781", fontSize: 12 }}
                    axisLine={{ stroke: "#c3c2b7" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => `${Math.round(Number(value) / 10000).toLocaleString("ja-JP")}万`}
                    tick={{ fill: "#898781", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    cursor={{ fill: "#e1e0d9", opacity: 0.4 }}
                    contentStyle={{
                      background: "#fcfcfb",
                      border: "1px solid rgba(11,11,11,0.10)",
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                    labelStyle={{ color: "#0b0b0b", fontWeight: 500 }}
                    itemStyle={{ color: "#52514e" }}
                    formatter={(value) => [formatYen(Number(value)), "控除額"]}
                    labelFormatter={(label) => `${label}年目`}
                  />
                  <Bar dataKey="deductionAmount" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm text-ink/55">
              控除額合計：<span className="font-medium text-ink">{formatYen(deduction.totalDeduction)}</span>
            </p>
          </>
        )}
      </div>

      <div>
        <h3 className="font-heading text-lg text-ink">税制軽減</h3>
        <div className="mt-2">
          <EligibilityBadge
            eligible={taxReduction.eligible}
            label={`不動産取得税・登録免許税の軽減：${taxReduction.eligible ? "対象" : "対象外"}`}
          />
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg text-ink">自治体独自の補助金</h3>
        <div className="mt-2 space-y-3 rounded-lg border border-ink/15 bg-white p-4 text-sm">
          <p className="text-ink/65">
            国の制度（住宅ローン控除・税の軽減）とは別に、市区町村独自の補助金が存在することがあります。全国網羅は難しいため、以下のリンクからご自身で確認してください。
          </p>
          <div className="space-y-2">
            {localSubsidySearchUrl ? (
              <a
                href={localSubsidySearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-accent hover:underline"
              >
                Google検索で「{trimmedLocation} 住宅購入 補助金」を調べる
              </a>
            ) : (
              <p className="text-ink/55">所在地を入力すると検索リンクを表示します</p>
            )}
            <a
              href={MLIT_HOUSING_SUPPORT_SEARCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-accent hover:underline"
            >
              国土交通省 住宅支援制度検索サイト
            </a>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg text-ink">生涯コストの目安</h3>
        <p className="mt-1 text-sm text-ink/55">
          固定資産税等・維持費の保有期間中の合計は、保有期間の目安として返済期間（{property.loanTermYears}
          年）を使用して計算しています。
        </p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="総返済額" value={formatYen(lifetimeCost.totalRepayment)} />
          <StatTile label="住宅ローン控除 合計" value={`-${formatYen(lifetimeCost.totalMortgageDeduction)}`} />
          <StatTile
            label="固定資産税等 合計"
            value={formatYen(lifetimeCost.totalPropertyTax)}
            badge={lifetimeCost.isPropertyTaxEstimated ? "概算" : undefined}
          />
          <StatTile label="維持費 合計" value={formatYen(lifetimeCost.totalMaintenanceCost)} />
          <StatTile label="実質負担額の目安" value={formatYen(lifetimeCost.netLifetimeCost)} />
        </div>
      </div>
    </section>
  );
}
