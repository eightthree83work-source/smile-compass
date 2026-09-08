"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Property } from "@/lib/types";
import { calculateLifetimeCostEstimate, calculateLoanRepayment } from "@/lib/calculations";
import { getLegalChecklist } from "@/lib/legalChecklist";
import { getInspectionChecklist } from "@/lib/inspectionChecklist";
import { truncateAddressToCityLevel } from "@/lib/address";
import { VALUATION_JUDGMENT_LABELS, calculatePricePerTsuboManYen, judgeValuation } from "@/lib/valuation";
import ShareResultCard from "@/components/ShareResultCard";
import SavePropertyDialog from "@/components/SavePropertyDialog";
import { ComparisonSnapshot } from "@/lib/propertyComparison";
import {
  FpAdvisorFaceIcon,
  InspectorFaceIcon,
  LegalAdvisorFaceIcon,
  RealtorFaceIcon,
} from "@/components/icons/AdvisorCharacterImages";

export type SaveComparisonPropertyResult = "saved" | "limit-reached";

interface DiagnosisSummaryCardProps {
  property: Property;
  /** 不動産プロのサポートタブで入力・取得された、周辺相場の坪単価（万円） */
  marketPricePerTsuboManYen: number;
  /** 比較用の保存済み物件一覧に、現在の診断結果スナップショットを保存する */
  onSaveComparisonProperty: (nickname: string, snapshot: ComparisonSnapshot) => SaveComparisonPropertyResult;
  /** 保存した物件一覧から開いて編集中の場合、そのニックネーム（再保存ダイアログの初期値に使う） */
  currentNickname?: string | null;
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

const SHARE_APP_URL = "smile-compass.vercel.app";
const SHARE_TEXT = "smile compassで住まいの診断をしてみました🧭\n#smilecompass #住まい探し";

function buildTwitterIntentUrl(): string {
  const params = new URLSearchParams({ text: SHARE_TEXT, url: `https://${SHARE_APP_URL}` });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/** 「共有」を表す一般的なアイコン（箱から矢印が上に飛び出す形） */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 15V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

export default function DiagnosisSummaryCard({
  property,
  marketPricePerTsuboManYen,
  onSaveComparisonProperty,
  currentNickname,
}: DiagnosisSummaryCardProps) {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showTwitterFallback, setShowTwitterFallback] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

  const trimmedLocation = property.location.trim();
  const cityLevelLocation = trimmedLocation ? truncateAddressToCityLevel(trimmedLocation) : null;

  const displayedLocation = !trimmedLocation
    ? "所在地未入力の物件"
    : showFullAddress
      ? trimmedLocation
      : `${cityLevelLocation ?? "所在地"}（詳細は非公開）`;

  const today = new Date();
  const issuedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  const handleShare = async () => {
    if (!shareCardRef.current || isGeneratingImage) return;

    setImageError(null);
    setShowTwitterFallback(false);
    setIsGeneratingImage(true);

    try {
      // Webフォント（Shippori Mincho・Noto Sans JP等）の読み込みを待ってからキャプチャする
      await document.fonts.ready;

      const dataUrl = await toPng(shareCardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      const fileName = "smile-compass-diagnosis.png";

      const canUseShareSheet =
        typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function";

      if (canUseShareSheet) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], fileName, { type: "image/png" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "smile compass 診断サマリー",
            text: SHARE_TEXT,
            url: `https://${SHARE_APP_URL}`,
          });
          return;
        }
      }

      // navigator.shareが使えない環境（PCのブラウザなど）は画像をダウンロードさせ、
      // あわせてXの投稿画面をあとから開けるようにする
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
      setShowTwitterFallback(true);
    } catch (error) {
      // ユーザーが共有シートをキャンセルした場合、AbortErrorが発生するがエラー表示は不要
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
      setImageError("画像の生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleConfirmSave = (nickname: string) => {
    const snapshot: ComparisonSnapshot = {
      pricePerTsuboManYen: pricePerTsubo,
      marketPricePerTsuboManYen,
      diffPercent: valuationResult ? valuationResult.diffPercent : null,
      judgment: valuationResult ? valuationResult.judgment : null,
      monthlyPayment: repayment.monthlyPayment,
      netLifetimeCost: lifetimeCost.netLifetimeCost,
      legalChecklistCount: legalChecklist.length,
      inspectionChecklistCount: inspectionChecklist.length,
    };
    const result = onSaveComparisonProperty(nickname, snapshot);
    setShowSaveDialog(false);
    setSaveMessage(
      result === "limit-reached"
        ? "保存できる件数の上限に達しました。「保存した物件」から不要な物件を削除してください。"
        : "物件を保存しました。「保存した物件」から確認できます。",
    );
  };

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 px-1 pb-2 text-sm">
        <label className="flex items-center gap-2 text-ink/65">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink/25 text-accent focus:ring-accent"
            checked={showFullAddress}
            onChange={(e) => setShowFullAddress(e.target.checked)}
          />
          住所を表示する
        </label>
        <button
          type="button"
          onClick={() => setShowSaveDialog(true)}
          className="flex min-h-12 touch-manipulation items-center gap-2 rounded-full border border-ink/20 bg-white px-5 py-3 text-base font-medium text-ink/75 shadow-sm active:bg-ink/5"
        >
          この物件を保存する
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={isGeneratingImage}
          className="flex min-h-12 touch-manipulation items-center gap-2 rounded-full bg-accent px-5 py-3 text-base font-bold text-white shadow-sm active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShareIcon className="h-5 w-5 shrink-0" />
          {isGeneratingImage ? "生成中..." : "診断結果をシェアする🧭"}
        </button>
      </div>
      {imageError && <p className="px-1 pb-2 text-right text-xs text-[#a12f2f]">{imageError}</p>}
      {saveMessage && (
        <p className="px-1 pb-2 text-right text-xs text-ink/60">{saveMessage}</p>
      )}
      {showSaveDialog && (
        <SavePropertyDialog
          defaultNickname={currentNickname || trimmedLocation || "無題の物件"}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
      {showTwitterFallback && (
        <div className="flex flex-col items-end gap-1 px-1 pb-2">
          <a
            href={buildTwitterIntentUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-9 touch-manipulation rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white active:opacity-80"
          >
            Xでシェアする
          </a>
          <p className="text-xs text-ink/50">ダウンロードした画像を投稿画面に添付してください</p>
        </div>
      )}

      <div className="rounded-lg border border-ink/15 bg-white px-6 py-6 sm:px-10 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 pb-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-ink/45">DIAGNOSIS SUMMARY</p>
            <h3 className="mt-1 font-heading text-2xl text-ink">{displayedLocation}</h3>
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

        <div className="mt-6 flex items-center justify-end gap-1.5 border-t border-ink/10 pt-3 text-ink/35">
          <svg width="16" height="16" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="#FBF6EC" stroke="currentColor" strokeWidth="5" />
            <polygon points="50,28 64,56 36,56" fill="currentColor" />
            <circle cx="40" cy="64" r="4" fill="currentColor" />
            <circle cx="60" cy="64" r="4" fill="currentColor" />
            <path d="M38 74 Q50 83 62 74" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] tracking-wide">{SHARE_APP_URL}</span>
        </div>
      </div>

      <ShareResultCard
        cardRef={shareCardRef}
        displayedLocation={displayedLocation}
        issuedDate={issuedDate}
        ownPricePerTsubo={pricePerTsubo}
        marketPricePerTsuboManYen={marketPricePerTsuboManYen}
        valuationResult={valuationResult}
        monthlyPayment={repayment.monthlyPayment}
        netLifetimeCost={lifetimeCost.netLifetimeCost}
        legalChecklistCount={legalChecklist.length}
        inspectionChecklistCount={inspectionChecklist.length}
      />
    </div>
  );
}
