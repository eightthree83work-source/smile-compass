import { Property } from "@/lib/types";
import { calculateLifetimeCostEstimate, calculateLoanRepayment } from "@/lib/calculations";
import { getLegalChecklist } from "@/lib/legalChecklist";
import { getInspectionChecklist } from "@/lib/inspectionChecklist";
import { VALUATION_JUDGMENT_LABELS, calculatePricePerTsuboManYen, judgeValuation } from "@/lib/valuation";
import {
  FpAdvisorFaceIcon,
  InspectorFaceIcon,
  LegalAdvisorFaceIcon,
  RealtorFaceIcon,
} from "@/components/icons/AdvisorCharacterImages";

interface DiagnosisSummaryCardProps {
  property: Property;
  /** 不動産プロのサポートタブで入力・取得された、周辺相場の坪単価（万円） */
  marketPricePerTsuboManYen: number;
}

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
}

const JUDGMENT_STYLES: Record<string, string> = {
  undervalued: "text-[#0b6b0b]",
  reasonable: "text-ink",
  overvalued: "text-accent",
};

export default function DiagnosisSummaryCard({ property, marketPricePerTsuboManYen }: DiagnosisSummaryCardProps) {
  const hasEnoughData = property.price > 0 && property.floorAreaSqm > 0;

  if (!hasEnoughData) {
    return (
      <div className="mt-8 rounded-lg border border-ink/15 bg-white px-6 py-10 text-center text-sm text-ink/55">
        物件情報を入力すると診断サマリーが表示されます
      </div>
    );
  }

  const pricePerTsubo = calculatePricePerTsuboManYen(property);
  const valuationResult =
    pricePerTsubo !== null && marketPricePerTsuboManYen > 0
      ? judgeValuation(pricePerTsubo, marketPricePerTsuboManYen)
      : null;

  const repayment = calculateLoanRepayment(property);
  const lifetimeCost = calculateLifetimeCostEstimate(property);

  const legalChecklist = getLegalChecklist(property);
  const inspectionChecklist = getInspectionChecklist(property);
  const inspectionPriorityCount = inspectionChecklist.filter((item) => item.priority).length;

  const propertyName = property.location.trim() || "所在地未入力の物件";

  const today = new Date();
  const issuedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  return (
    <div className="mt-8 rounded-lg border border-ink/15 bg-white px-6 py-6 sm:px-10 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 pb-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-ink/45">DIAGNOSIS SUMMARY</p>
          <h3 className="mt-1 font-heading text-2xl text-ink">{propertyName}</h3>
        </div>
        <div className="text-right text-xs text-ink/45">
          <p>診断日</p>
          <p className="mt-0.5 font-heading text-ink">{issuedDate}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink/45">
            <RealtorFaceIcon className="h-5 w-5 shrink-0" />
            不動産プロのサポート｜坪単価判定
          </dt>
          <dd
            className={`mt-1 font-heading text-xl ${
              valuationResult ? JUDGMENT_STYLES[valuationResult.judgment] : "text-ink/35"
            }`}
          >
            {valuationResult ? VALUATION_JUDGMENT_LABELS[valuationResult.judgment] : "周辺相場を入力すると表示されます"}
          </dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink/45">
            <FpAdvisorFaceIcon className="h-5 w-5 shrink-0" />
            FPのサポート｜月々返済額
          </dt>
          <dd className="mt-1 font-heading text-xl text-ink">{formatYen(repayment.monthlyPayment)}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink/45">
            <FpAdvisorFaceIcon className="h-5 w-5 shrink-0" />
            FPのサポート｜生涯コストの目安
          </dt>
          <dd className="mt-1 font-heading text-xl text-ink">{formatYen(lifetimeCost.netLifetimeCost)}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink/45">
            <span className="flex -space-x-1.5">
              <LegalAdvisorFaceIcon className="h-5 w-5 shrink-0 ring-2 ring-white" />
              <InspectorFaceIcon className="h-5 w-5 shrink-0 ring-2 ring-white" />
            </span>
            宅建士・住宅診断士のサポート｜要確認項目数
          </dt>
          <dd className="mt-1 font-heading text-xl text-ink">
            {legalChecklist.length + inspectionChecklist.length}項目
            <span className="ml-2 font-sans text-sm text-ink/50">
              （宅建士{legalChecklist.length}・診断士{inspectionChecklist.length}
              {inspectionPriorityCount > 0 ? `／優先${inspectionPriorityCount}` : ""}）
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
