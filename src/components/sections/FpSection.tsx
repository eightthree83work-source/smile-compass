"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CharacterTooltip from "@/components/CharacterTooltip";
import CurrencyInput from "@/components/CurrencyInput";
import { INPUT_CLASS_NAME } from "@/components/PropertyForm";
import { FpAdvisorCharacterImage, FpAdvisorFaceIcon } from "@/components/icons/AdvisorCharacterImages";
import {
  REPAYMENT_BURDEN_DISCLAIMER_TEXT,
  RepaymentBurdenLevel,
  assessRepaymentBurden,
} from "@/lib/affordability";
import { generateId } from "@/lib/id";
import { DEFAULT_INTEREST_RATE_ANNUAL, DEFAULT_LOAN_TERM_YEARS, Property } from "@/lib/types";
import {
  AmortizationYearPoint,
  LifetimeExpenseYearPoint,
  LoanScenarioKind,
  LoanScenarioSummary,
  RateChangeEvent,
  calculateAmortizedLoan,
  calculateLifetimeCostEstimate,
  calculateLoanRepayment,
  calculateMultiPhaseLifetimeCostEstimate,
  generateAmortizationSchedule,
  generateLifetimeExpenseTimeline,
  generateMultiPhaseAmortizationSchedule,
  getAcquisitionAndRegistrationTaxReduction,
  getLoanPrincipal,
  simulateMortgageDeduction,
  summarizeMultiPhaseLoan,
} from "@/lib/calculations";

interface FpSectionProps {
  property: Property;
  onChange: (next: Property) => void;
  /** 固定/変動金利シナリオの比較結果（有利なほう）が変わるたびに、診断サマリーカード連携用に通知する */
  onScenarioSummaryChange: (summary: LoanScenarioSummary) => void;
}

const MLIT_HOUSING_SUPPORT_SEARCH_URL =
  "https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk3_000055.html";

const HOUSEHOLD_INCOME_CTA_TEXT =
  "年収を入力すると、月々の返済に無理がないか・融資が通りそうかの目安を診断します。";

// 坪単価判定（JUDGMENT_STYLES）・住宅ローン控除の対象外バッジ（EligibilityBadge）と同じ配色トーンを踏襲
const REPAYMENT_BURDEN_STYLES: Record<RepaymentBurdenLevel, string> = {
  comfortable: "border-[#0ca30c]/30 bg-[#0ca30c]/5 text-[#0b6b0b]",
  reasonable: "border-ink/15 bg-ink/5 text-ink/70",
  caution: "border-accent/30 bg-accent/5 text-accent",
  risk: "border-[#d03b3b]/30 bg-[#d03b3b]/5 text-[#a12f2f]",
};

// 詳細設定モードの行内で使う小さめの入力欄用（INPUT_CLASS_NAMEのw-fullを持ち込むと横並びで幅の指定が効かないため専用に用意する）
const COMPACT_INPUT_CLASS_NAME =
  "block w-24 rounded-md border border-ink/20 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
}

function formatYearLabel(year: number): string {
  return `${year}年目`;
}

function formatManYenAxisTick(value: number): string {
  return `${Math.round(value / 10000).toLocaleString("ja-JP")}万`;
}

// グラフ共通のスタイル（既存の住宅ローン控除グラフの配色・トーンを踏襲）
const CHART_GRID_COLOR = "#e1e0d9";
const CHART_AXIS_LINE_COLOR = "#c3c2b7";
const CHART_TICK_STYLE = { fill: "#898781", fontSize: 12 };
const CHART_TOOLTIP_CONTENT_STYLE = {
  background: "#fcfcfb",
  border: "1px solid rgba(11,11,11,0.10)",
  borderRadius: 6,
  fontSize: 13,
};
const CHART_TOOLTIP_LABEL_STYLE = { color: "#0b0b0b", fontWeight: 500 };
const CHART_TOOLTIP_ITEM_STYLE = { color: "#52514e" };
const CHART_LEGEND_STYLE = { fontSize: 12, color: "#52514e" };

// 系列ごとの色（ink #1A2420・accent #E8654A を基調に、中間トーンを2色追加）
const PRINCIPAL_COLOR = "#e8654a"; // 元金（accent）
const INTEREST_COLOR = "#c7c0b0"; // 利息（暖色寄りのニュートラルグレー）
const BALANCE_LINE_COLOR = "#1a2420"; // 残債（ink）
const LOAN_PAYMENT_COLOR = "#1a2420"; // 住宅ローン返済額（ink）
const PROPERTY_TAX_COLOR = "#e8654a"; // 固定資産税等（accent）
const MAINTENANCE_COST_COLOR = "#7c93a6"; // 年間維持費（ink・accentと区別できる青灰）
const FIXED_RATE_LINE_COLOR = "#1a2420"; // 固定金利シナリオ（ink）
const VARIABLE_RATE_LINE_COLOR = "#e8654a"; // 変動金利シナリオ（accent）

const CUMULATIVE_CHART_CHARACTER_TEXT =
  "この線が右肩上がりになるほど、住宅にかかる生涯コストが積み上がっていくよ。傾きが急に変わるところがあれば、それは金利の変更や維持費の増加が効いてきたタイミング。『実質負担額の目安』が、将来のご自身の収入やライフプランと比べて無理のない範囲か、家族で話し合う材料にしてみてね。";

const MAINTENANCE_TREND_CHART_CHARACTER_TEXT =
  "維持費は建物が古くなるほど増える傾向があるよ。グラフの縦線が引いてある年は、その増加が反映されるタイミング。このタイミングの少し前から修繕費用の積み立てを増やしておくと安心。固定資産税等は期間中大きな変化はしないけど、実際は建物の評価額が下がって軽減されるケースもあるから、あくまで概算として見てね。";

// ---------------------------------------------------------------------------
// 変動金利：多段階の上昇シナリオ（簡単入力／詳細設定で共通のデータ形）
// ---------------------------------------------------------------------------

interface RateIncreaseStep {
  id: string;
  /** 借入から何年後にこの上昇が起きるか */
  afterYears: number;
  /**
   * この回の上昇幅（%、前の金利からの差分）の入力文字列。
   * 「-」「0」「0.」「-0」のような入力途中の状態もそのまま保持できるよう、
   * 数値ではなく文字列でstateに持つ（onChangeで都度Number変換すると、
   * 入力途中の不完全な文字列がNaN扱いになり、入力が弾かれてしまうため）。
   * 実際の計算に使う数値への変換はparseSignedDecimalで行う。
   */
  rateChangePercentInput: string;
}

/** 数値として不完全な入力途中の文字列（""「-」「.」など）はNumber()がNaNを返すため、その場合は0として扱う */
function parseSignedDecimal(input: string): number {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 「上昇幅・間隔・回数」から、間隔ごとに一定幅で上昇するステップ列を生成する（簡単入力モード用） */
function generateStepsFromSimpleInputs(amountInput: string, intervalYears: number, count: number): RateIncreaseStep[] {
  if (intervalYears <= 0 || count <= 0) return [];
  return Array.from({ length: count }, (_, index) => ({
    id: `simple-${index}`,
    afterYears: intervalYears * (index + 1),
    rateChangePercentInput: amountInput,
  }));
}

/** ステップ列（上昇幅の差分）を、計算エンジンが受け取る絶対金利のイベント列に変換する */
function buildRateChangeEvents(initialRateAnnual: number, steps: RateIncreaseStep[]): RateChangeEvent[] {
  const sorted = [...steps].sort((a, b) => a.afterYears - b.afterYears);
  let cumulativeRate = initialRateAnnual;
  return sorted.map((step) => {
    cumulativeRate += parseSignedDecimal(step.rateChangePercentInput);
    return { afterYears: step.afterYears, newRateAnnual: cumulativeRate };
  });
}

function formatRateChangePercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div style={CHART_TOOLTIP_CONTENT_STYLE} className="px-3 py-2">
      <p style={CHART_TOOLTIP_LABEL_STYLE}>{formatYearLabel(Number(label))}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.name} style={CHART_TOOLTIP_ITEM_STYLE} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color }} />
            <span>
              {entry.name}：{formatYen(Number(entry.value))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
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
  label: ReactNode;
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

/**
 * 符号付き小数（マイナス値・「0.25」のような0始まりの小数）を入力するための欄。
 * CurrencyInputは「-」を除去する・「0」を空欄扱いにする等、符号付き小数の入力途中の状態を
 * 保持できないため、ここでは数値変換をせず入力文字列をそのままstateに渡す。
 */
function SignedDecimalInput({
  id,
  label,
  value,
  onChange,
  className = INPUT_CLASS_NAME,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink/80">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

const REPAYMENT_SCHEDULE_SYNC_ID = "repaymentSchedule";

/**
 * 返済シミュレーション：残債（ローン残高、数千万円規模）と年間返済額の内訳（数百万円規模）は桁が大きく異なるため、
 * 同じ軸に重ねると内訳の棒グラフが潰れて見えなくなる。上段（残債の折れ線）と下段（元金・利息の積み上げ棒）に
 * 分けて、それぞれ別スケールのy軸で表示する。syncIdでx軸の位置とツールチップ表示を連動させる。
 */
function RepaymentScheduleChart({
  schedule,
  loanPrincipal,
}: {
  schedule: AmortizationYearPoint[];
  loanPrincipal: number;
}) {
  if (schedule.length === 0) return null;

  return (
    <div className="mt-4 space-y-1">
      <div className="h-36 rounded-lg rounded-b-none border border-b-0 border-ink/15 bg-background p-4 pb-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={schedule} syncId={REPAYMENT_SCHEDULE_SYNC_ID} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
            <XAxis dataKey="year" hide />
            <YAxis
              domain={[0, Math.max(loanPrincipal, 1)]}
              tickFormatter={formatManYenAxisTick}
              tick={CHART_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CurrencyTooltip />} />
            <Line type="monotone" dataKey="endBalance" name="残債" stroke={BALANCE_LINE_COLOR} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="px-4 text-xs text-ink/45">↑ 残債（ローン残高）　↓ 年間返済額の内訳（元金・利息）</p>
      <div className="h-44 rounded-lg rounded-t-none border border-t-0 border-ink/15 bg-background p-4 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={schedule}
            syncId={REPAYMENT_SCHEDULE_SYNC_ID}
            barCategoryGap="20%"
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
            <XAxis
              dataKey="year"
              tickFormatter={formatYearLabel}
              tick={CHART_TICK_STYLE}
              axisLine={{ stroke: CHART_AXIS_LINE_COLOR }}
              tickLine={false}
            />
            <YAxis
              domain={[0, "dataMax"]}
              tickFormatter={formatManYenAxisTick}
              tick={CHART_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip cursor={{ fill: CHART_GRID_COLOR, opacity: 0.4 }} content={<CurrencyTooltip />} />
            <Legend wrapperStyle={CHART_LEGEND_STYLE} />
            <Bar dataKey="principalPaid" name="元金" stackId="repayment" fill={PRINCIPAL_COLOR} maxBarSize={20} />
            <Bar
              dataKey="interestPaid"
              name="利息"
              stackId="repayment"
              fill={INTEREST_COLOR}
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface CumulativeLifetimeCostPoint {
  year: number;
  cumulativeLoanPayment: number;
  cumulativePropertyTax: number;
  cumulativeMaintenanceCost: number;
}

/**
 * 生涯コストの累計：住宅ローン返済額・固定資産税等・維持費それぞれの累計額を積み上げエリアチャートで表示する。
 * 年ごとの合計だと返済額の大きさに他の2項目が埋もれてしまうため、右肩上がりの積み上がりを見せる形に変更した。
 * 最終年の到達点は、calculateHoldingPeriodCosts / calculateLifetimeCostEstimateの合計と一致する
 * （どちらもgenerateLifetimeExpenseTimelineの年別内訳を合算しているため）。
 */
function CumulativeLifetimeCostChart({ data }: { data: CumulativeLifetimeCostPoint[] }) {
  if (data.length === 0) return null;

  return (
    <div className="mt-4 h-72 rounded-lg border border-ink/15 bg-background p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
          <XAxis
            dataKey="year"
            tickFormatter={formatYearLabel}
            tick={CHART_TICK_STYLE}
            axisLine={{ stroke: CHART_AXIS_LINE_COLOR }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatManYenAxisTick}
            tick={CHART_TICK_STYLE}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend wrapperStyle={CHART_LEGEND_STYLE} />
          <Area
            type="monotone"
            dataKey="cumulativeLoanPayment"
            name="住宅ローン返済額（累計）"
            stackId="cumulative"
            stroke={LOAN_PAYMENT_COLOR}
            fill={LOAN_PAYMENT_COLOR}
            fillOpacity={0.85}
          />
          <Area
            type="monotone"
            dataKey="cumulativePropertyTax"
            name="固定資産税等（累計）"
            stackId="cumulative"
            stroke={PROPERTY_TAX_COLOR}
            fill={PROPERTY_TAX_COLOR}
            fillOpacity={0.85}
          />
          <Area
            type="monotone"
            dataKey="cumulativeMaintenanceCost"
            name="維持費（累計）"
            stackId="cumulative"
            stroke={MAINTENANCE_COST_COLOR}
            fill={MAINTENANCE_COST_COLOR}
            fillOpacity={0.85}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MaintenanceCostFactorTransition {
  year: number;
  buildingAgeYears: number;
  fromFactor: number;
  toFactor: number;
}

/** 維持費の築年数係数が前年から変化するタイミング（年）を抽出する */
function getMaintenanceCostFactorTransitions(
  timeline: LifetimeExpenseYearPoint[],
  buildingAgeYears: number,
): MaintenanceCostFactorTransition[] {
  const transitions: MaintenanceCostFactorTransition[] = [];

  for (let i = 1; i < timeline.length; i++) {
    const previous = timeline[i - 1];
    const current = timeline[i];
    if (current.isMaintenanceCostEstimated && current.maintenanceCostFactor !== previous.maintenanceCostFactor) {
      transitions.push({
        year: current.year,
        buildingAgeYears: buildingAgeYears + current.year - 1,
        fromFactor: previous.maintenanceCostFactor,
        toFactor: current.maintenanceCostFactor,
      });
    }
  }

  return transitions;
}

/**
 * 固定資産税等・維持費の推移：固定資産税等はestimatePropertyTaxAnnualの結果を毎年そのまま使っており
 * 期間中変化しないため、グラフでは年々変化する維持費のみを表示し、固定資産税等は別途テキストで注記する。
 * 維持費の築年数係数が変わる年には、金利変更時と同じ「縦の点線＋注記ラベル」で示す。
 */
function MaintenanceCostTrendChart({
  timeline,
  buildingAgeYears,
}: {
  timeline: LifetimeExpenseYearPoint[];
  buildingAgeYears: number;
}) {
  if (timeline.length === 0) return null;

  const transitions = getMaintenanceCostFactorTransitions(timeline, buildingAgeYears);

  return (
    <div className="mt-4 h-64 rounded-lg border border-ink/15 bg-background p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={timeline} barCategoryGap="20%" margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[1, "dataMax"]}
            allowDecimals={false}
            tickFormatter={formatYearLabel}
            tick={CHART_TICK_STYLE}
            axisLine={{ stroke: CHART_AXIS_LINE_COLOR }}
            tickLine={false}
          />
          <YAxis
            domain={[0, "dataMax"]}
            tickFormatter={formatManYenAxisTick}
            tick={CHART_TICK_STYLE}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip cursor={{ fill: CHART_GRID_COLOR, opacity: 0.4 }} content={<CurrencyTooltip />} />
          {transitions.map((transition) => (
            <ReferenceLine
              key={transition.year}
              x={transition.year - 0.5}
              stroke={CHART_AXIS_LINE_COLOR}
              strokeDasharray="4 4"
              label={{
                value: `築${transition.buildingAgeYears}年経過で維持費係数が上昇（${transition.fromFactor}→${transition.toFactor}倍）`,
                position: "insideTopLeft",
                fontSize: 11,
                fill: "#52514e",
              }}
            />
          ))}
          <Bar dataKey="maintenanceCostYen" name="年間維持費" fill={MAINTENANCE_COST_COLOR} radius={[3, 3, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface RateComparisonPoint {
  year: number;
  fixedPayment: number;
  variablePayment: number;
}

interface RateSwitchMarker {
  /** 変更前の最終年（この年とその次の年の間に縦線を引く） */
  year: number;
  label: string;
  position: "insideTopLeft" | "insideBottomLeft";
}

/**
 * 固定金利 vs 変動金利：年間返済額そのものの推移を階段状の折れ線で比較する。
 * 累計返済額だと大きな数字に金利変化の影響が埋もれてしまうため、年間返済額に絞って表示する。
 * 金利変更が複数回ある場合、縦線ごとに1つずつコンパクトなラベルを表示し、
 * 上下交互の位置にすることでラベルの重なりを軽減している。
 */
function RateComparisonChart({ data, switchMarkers }: { data: RateComparisonPoint[]; switchMarkers: RateSwitchMarker[] }) {
  if (data.length === 0) return null;

  return (
    <div className="mt-4 h-72 rounded-lg border border-ink/15 bg-background p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[1, "dataMax"]}
            allowDecimals={false}
            tickFormatter={formatYearLabel}
            tick={CHART_TICK_STYLE}
            axisLine={{ stroke: CHART_AXIS_LINE_COLOR }}
            tickLine={false}
          />
          <YAxis
            domain={[0, "dataMax"]}
            tickFormatter={formatManYenAxisTick}
            tick={CHART_TICK_STYLE}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend wrapperStyle={CHART_LEGEND_STYLE} />
          {switchMarkers.map((marker) => (
            <ReferenceLine
              key={marker.year}
              x={marker.year + 0.5}
              stroke={CHART_AXIS_LINE_COLOR}
              strokeDasharray="4 4"
              label={{ value: marker.label, position: marker.position, fontSize: 11, fill: "#52514e" }}
            />
          ))}
          <Line
            type="stepAfter"
            dataKey="fixedPayment"
            name="固定金利シナリオ（年間返済額）"
            stroke={FIXED_RATE_LINE_COLOR}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="stepAfter"
            dataKey="variablePayment"
            name="変動金利シナリオ（年間返済額）"
            stroke={VARIABLE_RATE_LINE_COLOR}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function FpSection({ property, onChange, onScenarioSummaryChange }: FpSectionProps) {
  const loanPrincipal = getLoanPrincipal(property);
  const repayment = calculateLoanRepayment(property);
  const repaymentSchedule = generateAmortizationSchedule(loanPrincipal, property.interestRateAnnual, property.loanTermYears);
  const deduction = simulateMortgageDeduction(property);
  const taxReduction = getAcquisitionAndRegistrationTaxReduction(property);
  const lifetimeCost = calculateLifetimeCostEstimate(property);
  const lifetimeExpenseTimeline = generateLifetimeExpenseTimeline(property);
  const repaymentBurden = assessRepaymentBurden(property);

  // 生涯コストの累計グラフ用：年ごとの支出を積み上げていく
  const cumulativeLifetimeCostData = lifetimeExpenseTimeline.reduce<CumulativeLifetimeCostPoint[]>((acc, point) => {
    const previous = acc[acc.length - 1];
    acc.push({
      year: point.year,
      cumulativeLoanPayment: (previous?.cumulativeLoanPayment ?? 0) + point.loanPaymentYen,
      cumulativePropertyTax: (previous?.cumulativePropertyTax ?? 0) + point.propertyTaxYen,
      cumulativeMaintenanceCost: (previous?.cumulativeMaintenanceCost ?? 0) + point.maintenanceCostYen,
    });
    return acc;
  }, []);
  // 固定資産税等は年によらず一定額のため、代表値としてそのまま表示する
  const propertyTaxAnnualYen = lifetimeExpenseTimeline[0]?.propertyTaxYen ?? 0;

  const trimmedLocation = property.location.trim();
  const localSubsidySearchUrl = trimmedLocation
    ? `https://www.google.com/search?q=${encodeURIComponent(`${trimmedLocation} 住宅購入 補助金`)}`
    : null;

  // 固定金利シナリオの金利は「返済計画」の金利（property.interestRateAnnual）と同一の状態を参照する
  // （どちらかを変更すればもう片方にも反映される）。変動金利シナリオの初期金利は独立して編集できる。
  // 「0.5」のような0始まりの小数を頭から入力できるよう、変動金利側は文字列で保持し計算時にのみ数値化する
  const fixedRateAnnual = property.interestRateAnnual;
  const [variableRateAnnualInput, setVariableRateAnnualInput] = useState(() => String(property.interestRateAnnual));
  const variableRateAnnual = parseSignedDecimal(variableRateAnnualInput);

  // 変動金利の上昇シナリオ：簡単入力モード（上昇幅・間隔・回数）と詳細設定モード（行の自由編集）を切り替えられる
  const [useDetailedRateSteps, setUseDetailedRateSteps] = useState(false);
  const [rateIncreaseAmountInput, setRateIncreaseAmountInput] = useState("0.25");
  const [rateIncreaseIntervalYears, setRateIncreaseIntervalYears] = useState(5);
  const [rateIncreaseCount, setRateIncreaseCount] = useState(4);
  const [detailedRateSteps, setDetailedRateSteps] = useState<RateIncreaseStep[]>([]);

  const simpleModeSteps = generateStepsFromSimpleInputs(
    rateIncreaseAmountInput,
    rateIncreaseIntervalYears,
    rateIncreaseCount,
  );
  const activeRateSteps = useDetailedRateSteps ? detailedRateSteps : simpleModeSteps;

  const handleToggleDetailedRateSteps = (checked: boolean) => {
    if (checked && detailedRateSteps.length === 0) {
      setDetailedRateSteps(
        simpleModeSteps.length > 0
          ? simpleModeSteps
          : [{ id: generateId(), afterYears: 5, rateChangePercentInput: "0.25" }],
      );
    }
    setUseDetailedRateSteps(checked);
  };

  const handleAddDetailedRateStep = () => {
    setDetailedRateSteps((prev) => [
      ...prev,
      { id: generateId(), afterYears: (prev[prev.length - 1]?.afterYears ?? 0) + 5, rateChangePercentInput: "0.25" },
    ]);
  };

  const handleUpdateDetailedRateStep = (
    id: string,
    patch: Partial<Pick<RateIncreaseStep, "afterYears" | "rateChangePercentInput">>,
  ) => {
    setDetailedRateSteps((prev) => prev.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  };

  const handleRemoveDetailedRateStep = (id: string) => {
    setDetailedRateSteps((prev) => prev.filter((step) => step.id !== id));
  };

  const totalLoanMonths = Math.round(property.loanTermYears * 12);
  const stepsWithinTerm = activeRateSteps.filter(
    (step) => step.afterYears > 0 && step.afterYears * 12 < totalLoanMonths,
  );
  const droppedStepCount = activeRateSteps.length - stepsWithinTerm.length;

  const rateChangeEvents = buildRateChangeEvents(variableRateAnnual, activeRateSteps);
  // 各ステップの上昇幅は前の金利からの差分の積み上げなので、累積後の絶対金利（rateChangeEvents）で判定する
  const hasNegativeRateWarning = variableRateAnnual < 0 || rateChangeEvents.some((event) => event.newRateAnnual < 0);

  const fixedScenario = calculateAmortizedLoan(loanPrincipal, fixedRateAnnual, property.loanTermYears);
  const variableRisingSummary = summarizeMultiPhaseLoan(loanPrincipal, property.loanTermYears, variableRateAnnual, rateChangeEvents);

  // 固定金利 vs 変動金利グラフ用：年間返済額そのものの階段状の推移データ
  const totalLoanYears = Math.ceil(totalLoanMonths / 12);
  const fixedRateSchedule = generateAmortizationSchedule(loanPrincipal, fixedRateAnnual, property.loanTermYears);
  const variableRateSchedule = generateMultiPhaseAmortizationSchedule(
    loanPrincipal,
    property.loanTermYears,
    variableRateAnnual,
    rateChangeEvents,
  );

  const rateComparisonData =
    totalLoanMonths > 0 && loanPrincipal > 0
      ? Array.from({ length: totalLoanYears }, (_, index) => ({
          year: index + 1,
          fixedPayment: fixedRateSchedule[index]?.totalPaid ?? 0,
          variablePayment: variableRateSchedule[index]?.totalPaid ?? 0,
        }))
      : [];

  const rateSwitchMarkers = stepsWithinTerm
    .slice()
    .sort((a, b) => a.afterYears - b.afterYears)
    .map((step, index) => ({
      year: step.afterYears,
      label: `${step.afterYears}年目 ${formatRateChangePercent(parseSignedDecimal(step.rateChangePercentInput))}`,
      position: (index % 2 === 0 ? "insideTopLeft" : "insideBottomLeft") as "insideTopLeft" | "insideBottomLeft",
    }));

  const rateScenarios: { key: LoanScenarioKind; label: string; monthlyPaymentLabel: string; totalRepayment: number; totalInterest: number }[] = [
    {
      key: "fixed",
      label: "固定金利のまま",
      monthlyPaymentLabel: formatYen(fixedScenario.monthlyPayment),
      totalRepayment: fixedScenario.totalRepayment,
      totalInterest: fixedScenario.totalInterest,
    },
    {
      key: "variableRising",
      label: "変動金利が上昇",
      monthlyPaymentLabel:
        variableRisingSummary.phases.length > 0
          ? variableRisingSummary.phases.map((phase) => formatYen(phase.monthlyPayment)).join(" → ")
          : formatYen(0),
      totalRepayment: variableRisingSummary.totalRepayment,
      totalInterest: variableRisingSummary.totalInterest,
    },
  ];

  // 総返済額が少ないほうを「最も有利」と判定する（同額なら固定金利を採用）
  const mostAdvantageousKey: LoanScenarioKind =
    variableRisingSummary.totalRepayment < fixedScenario.totalRepayment ? "variableRising" : "fixed";

  // 「最も有利」なシナリオの生涯コストの目安（固定資産税等・維持費は金利に依存しないため共通）
  const variableLifetimeCost = calculateMultiPhaseLifetimeCostEstimate(property, variableRateAnnual, rateChangeEvents);
  const advantageousScenarioSummary: LoanScenarioSummary =
    mostAdvantageousKey === "variableRising"
      ? {
          mostAdvantageous: "variableRising",
          monthlyPayment: variableRisingSummary.phases[0]?.monthlyPayment ?? 0,
          netLifetimeCost: variableLifetimeCost.netLifetimeCost,
        }
      : {
          mostAdvantageous: "fixed",
          monthlyPayment: fixedScenario.monthlyPayment,
          netLifetimeCost: lifetimeCost.netLifetimeCost,
        };

  // 有利なシナリオの判定結果を、診断サマリーカード（page.tsx経由）に通知する
  useEffect(() => {
    onScenarioSummaryChange(advantageousScenarioSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advantageousScenarioSummary.mostAdvantageous, advantageousScenarioSummary.monthlyPayment, advantageousScenarioSummary.netLifetimeCost]);

  return (
    <section className="mt-8 space-y-8">
      <div className="flex items-center gap-3">
        <FpAdvisorCharacterImage className="h-14 w-14 shrink-0" />
        <h2 className="font-heading text-xl text-ink">FPのサポート</h2>
      </div>

      <div className="rounded-lg border border-accent/30 bg-white p-4">
        {/*
          CurrencyInputは値が変わるたびに即座にonChangeする（他の入力欄と挙動を揃えるため）。
          このCTA自体をproperty.householdIncomeManYen<=0で丸ごと出し分けると、1桁目を
          入力した瞬間に条件がfalseになりCurrencyInputごとアンマウントされ、フォーカスが
          外れて2桁目以降が入力できなくなる。そのため入力欄自体は常に描画し、案内文だけを
          出し分ける。
        */}
        {property.householdIncomeManYen <= 0 && (
          <div className="flex items-start gap-2">
            <FpAdvisorFaceIcon className="h-6 w-6 shrink-0" />
            <p className="text-sm text-ink/70">{HOUSEHOLD_INCOME_CTA_TEXT}</p>
          </div>
        )}
        <div className={`max-w-xs ${property.householdIncomeManYen <= 0 ? "mt-3" : ""}`}>
          <label htmlFor="fpHouseholdIncomeManYen" className="block text-sm font-medium text-ink/80">
            世帯年収（万円）
          </label>
          <CurrencyInput
            id="fpHouseholdIncomeManYen"
            className={INPUT_CLASS_NAME}
            value={property.householdIncomeManYen === 0 ? undefined : property.householdIncomeManYen}
            onChange={(next) => onChange({ ...property, householdIncomeManYen: next ?? 0 })}
          />
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg text-ink">返済計画</h3>
        <p className="mt-1 text-sm text-ink/55">
          金利・返済期間は物件そのものの情報ではなくローンの組み方に関する条件のため、ここで調整します。未調整の場合は一般的な水準の既定値（金利{DEFAULT_INTEREST_RATE_ANNUAL}%・返済期間{DEFAULT_LOAN_TERM_YEARS}
          年）を使用します。
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="baseInterestRateAnnual" className="block text-sm font-medium text-ink/80">
              金利（年率 %）
            </label>
            <CurrencyInput
              id="baseInterestRateAnnual"
              className={INPUT_CLASS_NAME}
              value={property.interestRateAnnual}
              onChange={(next) => onChange({ ...property, interestRateAnnual: next ?? DEFAULT_INTEREST_RATE_ANNUAL })}
            />
          </div>
          <div>
            <label htmlFor="baseLoanTermYears" className="block text-sm font-medium text-ink/80">
              返済期間（年）
            </label>
            <CurrencyInput
              id="baseLoanTermYears"
              className={INPUT_CLASS_NAME}
              value={property.loanTermYears}
              onChange={(next) => onChange({ ...property, loanTermYears: next ?? DEFAULT_LOAN_TERM_YEARS })}
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="月々返済額" value={formatYen(repayment.monthlyPayment)} />
          <StatTile label="総返済額" value={formatYen(repayment.totalRepayment)} />
          <StatTile label="総利息" value={formatYen(repayment.totalInterest)} />
        </div>
        <p className="mt-4 text-sm text-ink/55">
          返済シミュレーション：上段が残債（ローン残高）の推移、下段が年ごとの返済額を元金・利息に分けた内訳です。桁が大きく異なるため軸を分けて表示しています。
        </p>
        <RepaymentScheduleChart schedule={repaymentSchedule} loanPrincipal={loanPrincipal} />
      </div>

      {repaymentBurden && (
        <div>
          <h3 className="font-heading text-lg text-ink">返済負担率の目安</h3>
          <p className="mt-1 text-sm text-ink/55">
            年間のローン返済額が世帯年収に占める割合（返済負担率）から、家計への負担感の目安を診断します。
          </p>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile label="返済負担率" value={`${repaymentBurden.ratioPercent.toFixed(1)}%`} />
            <div className={`flex items-center rounded-lg border p-4 text-sm ${REPAYMENT_BURDEN_STYLES[repaymentBurden.level]}`}>
              {repaymentBurden.comment}
            </div>
          </div>
          <p className="mt-2 text-xs text-ink/45">{REPAYMENT_BURDEN_DISCLAIMER_TEXT}</p>
        </div>
      )}

      <div>
        <h3 className="font-heading text-lg text-ink">固定金利 vs 変動金利</h3>
        <p className="mt-1 text-sm text-ink/55">
          借入額・返済期間は上の「返済計画」で設定した値を使用します。「変動金利が上昇」は、下の上昇シナリオで指定したタイミング・幅で金利が段階的に変わり、そのたびに残りの返済期間で返済額を組み直すという前提での試算です。実際の金利変動を予測するものではなく、あくまで目安としてご利用ください。
        </p>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fixedRateAnnual" className="block text-sm font-medium text-ink/80">
              固定金利シナリオ
              <br />
              （年率 %）
            </label>
            <CurrencyInput
              id="fixedRateAnnual"
              className={INPUT_CLASS_NAME}
              value={property.interestRateAnnual}
              onChange={(next) => onChange({ ...property, interestRateAnnual: next ?? DEFAULT_INTEREST_RATE_ANNUAL })}
            />
            <p className="mt-1 text-xs text-ink/40">上の「返済計画」の金利と共通です</p>
          </div>
          <SignedDecimalInput
            id="variableRateAnnual"
            label={
              <>
                変動金利シナリオ
                <br />
                （当初年率 %）
              </>
            }
            value={variableRateAnnualInput}
            onChange={setVariableRateAnnualInput}
          />
        </div>

        <div className="mt-6 rounded-lg border border-ink/15 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-heading text-base text-ink">変動金利の上昇シナリオ</h4>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ink/25 text-accent focus:ring-accent"
                checked={useDetailedRateSteps}
                onChange={(e) => handleToggleDetailedRateSteps(e.target.checked)}
              />
              詳細設定を使う
            </label>
          </div>

          {!useDetailedRateSteps ? (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SignedDecimalInput
                id="rateIncreaseAmount"
                label={
                  <>
                    上昇幅
                    <br />
                    （%）
                  </>
                }
                value={rateIncreaseAmountInput}
                onChange={setRateIncreaseAmountInput}
              />
              <RateInput
                id="rateIncreaseIntervalYears"
                label={
                  <>
                    上昇の間隔
                    <br />
                    （年）
                  </>
                }
                value={rateIncreaseIntervalYears}
                onChange={setRateIncreaseIntervalYears}
              />
              <RateInput
                id="rateIncreaseCount"
                label={
                  <>
                    上昇回数
                    <br />
                    （回）
                  </>
                }
                value={rateIncreaseCount}
                onChange={setRateIncreaseCount}
              />
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {detailedRateSteps.length === 0 && (
                <p className="text-sm text-ink/50">「行を追加」から金利変更のタイミングを追加してください。</p>
              )}
              {detailedRateSteps.map((step) => (
                <div key={step.id} className="flex flex-wrap items-center gap-2">
                  <CurrencyInput
                    id={`rate-step-year-${step.id}`}
                    className={COMPACT_INPUT_CLASS_NAME}
                    value={step.afterYears === 0 ? undefined : step.afterYears}
                    onChange={(next) => handleUpdateDetailedRateStep(step.id, { afterYears: next ?? 0 })}
                  />
                  <span className="text-sm text-ink/60">年目に</span>
                  <input
                    id={`rate-step-amount-${step.id}`}
                    type="text"
                    inputMode="decimal"
                    className={COMPACT_INPUT_CLASS_NAME}
                    value={step.rateChangePercentInput}
                    onChange={(e) => handleUpdateDetailedRateStep(step.id, { rateChangePercentInput: e.target.value })}
                  />
                  <span className="text-sm text-ink/60">% 変化</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDetailedRateStep(step.id)}
                    className="min-h-9 touch-manipulation rounded-md border border-ink/20 px-3 py-1.5 text-sm font-medium text-ink/60 active:bg-ink/5"
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddDetailedRateStep}
                className="min-h-9 touch-manipulation rounded-md border border-ink/20 bg-white px-3 py-1.5 text-sm font-medium text-ink/75 active:bg-ink/5"
              >
                + 行を追加
              </button>
            </div>
          )}

          {stepsWithinTerm.length > 0 && (
            <p className="mt-3 text-sm text-ink/55">
              開始金利{variableRateAnnual}%
              {stepsWithinTerm
                .slice()
                .sort((a, b) => a.afterYears - b.afterYears)
                .map(
                  (step) => ` → ${step.afterYears}年目に${formatRateChangePercent(parseSignedDecimal(step.rateChangePercentInput))}`,
                )
                .join("")}
            </p>
          )}
          {droppedStepCount > 0 && (
            <p className="mt-1 text-xs text-[#a12f2f]">
              返済期間（{property.loanTermYears}年）を超える上昇{droppedStepCount}件は計算に反映されていません。
            </p>
          )}
          {hasNegativeRateWarning && (
            <p className="mt-1 text-xs text-[#a12f2f]">上昇幅の設定により金利がマイナスになります。値を見直してください。</p>
          )}
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

        <p className="mt-4 text-sm text-ink/55">
          年間返済額の推移：固定金利シナリオと変動金利シナリオ（上昇シナリオ）を比較しています。縦線は金利が切り替わるタイミングです。
        </p>
        <RateComparisonChart data={rateComparisonData} switchMarkers={rateSwitchMarkers} />
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
            <p className="mt-2 text-sm text-ink/55">
              控除額合計：<span className="font-medium text-ink">{formatYen(deduction.totalDeduction)}</span>
              　（年末残高が借入限度額を上回っている間は控除額が一定になります。年ごとの残高の推移は上の「返済計画」グラフをご参照ください）
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
          <StatTile
            label="住宅ローン控除 合計"
            value={`-${formatYen(lifetimeCost.totalMortgageDeduction)}`}
            badge={!deduction.eligibility.eligible ? "対象外" : undefined}
          />
          <StatTile
            label="固定資産税等 合計"
            value={formatYen(lifetimeCost.totalPropertyTax)}
            badge={lifetimeCost.isPropertyTaxEstimated ? "概算" : undefined}
          />
          <StatTile label="維持費 合計" value={formatYen(lifetimeCost.totalMaintenanceCost)} />
          <StatTile label="実質負担額の目安" value={formatYen(lifetimeCost.netLifetimeCost)} />
        </div>

        {!deduction.eligibility.eligible && (
          <p className="mt-2 text-xs text-[#a12f2f]">
            住宅ローン控除：{deduction.eligibility.reasons.join(" / ")}のため対象外として計算しています。
          </p>
        )}
        <p className="mt-1 text-xs text-ink/40">
          住宅ローン控除は令和7年度の現行制度（借入限度額2,000万円／認定住宅等3,000万円、控除率0.7%、控除期間10年）で計算しています。今後の税制改正により条件が変わる可能性があります。
        </p>

        <div className="mt-4 flex items-start gap-2">
          <CharacterTooltip
            icon={<FpAdvisorFaceIcon className="h-6 w-6" />}
            text={CUMULATIVE_CHART_CHARACTER_TEXT}
            label="リスが生涯コストの累計グラフを解説"
          />
          <p className="text-sm text-ink/55">
            生涯コストの累計：住宅ローン返済額・固定資産税等・維持費それぞれの累計額です。最終年の到達点は上のカードの合計と一致します。
          </p>
        </div>
        <CumulativeLifetimeCostChart data={cumulativeLifetimeCostData} />

        <div className="mt-4 flex items-start gap-2">
          <CharacterTooltip
            icon={<FpAdvisorFaceIcon className="h-6 w-6" />}
            text={MAINTENANCE_TREND_CHART_CHARACTER_TEXT}
            label="リスが固定資産税等・維持費の推移グラフを解説"
          />
          <p className="text-sm text-ink/55">
            固定資産税等・維持費の推移：固定資産税等は期間中ほぼ一定（約{formatYen(propertyTaxAnnualYen)}/年）のため、ここでは年々変化する維持費の推移に絞って表示しています。縦の点線は、築年数の経過により維持費の概算係数が上がるタイミングです。
          </p>
        </div>
        <MaintenanceCostTrendChart timeline={lifetimeExpenseTimeline} buildingAgeYears={property.buildingAgeYears} />
      </div>
    </section>
  );
}
