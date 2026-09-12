"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Property, TabId } from "@/lib/types";
import {
  LoanScenarioSummary,
  calculateLifetimeCostEstimate,
  calculateLoanRepayment,
  simulateMortgageDeduction,
} from "@/lib/calculations";
import { getLegalChecklist } from "@/lib/legalChecklist";
import { getInspectionChecklist } from "@/lib/inspectionChecklist";
import { truncateAddressToCityLevel } from "@/lib/address";
import { VALUATION_JUDGMENT_LABELS, calculatePricePerTsuboManYen, judgeValuation } from "@/lib/valuation";
import ShareResultCard from "@/components/ShareResultCard";
import SavePropertyDialog from "@/components/SavePropertyDialog";
import { ComparisonSnapshot } from "@/lib/propertyComparison";
import { geocodeAddress } from "@/lib/geocoding";
import { HazardCheckResult, checkHazardAtPoint } from "@/lib/hazardCheck";
import { ShareSummary, encodeShareSummary } from "@/lib/shareSummary";
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
  /** サマリー内の各項目クリック時に、対応するタブへ切り替える */
  onNavigateToTab: (tab: TabId) => void;
  /** FPのサポートタブで判定した固定/変動金利シナリオの有利判定。未取得（FPタブ未訪問）の場合はnull */
  loanScenarioSummary: LoanScenarioSummary | null;
}

const LOAN_SCENARIO_ANNOTATION: Record<LoanScenarioSummary["mostAdvantageous"], string> = {
  fixed: "（固定金利想定）",
  variableRising: "（変動金利上昇シナリオ想定）",
};

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

// サマリー項目クリックで該当タブへ遷移できることを示す。ホバー時の薄い背景色・
// キーボードフォーカス時のリングでフィードバックする（-m-2/p-2は見た目のレイアウトを
// 変えずにクリック可能領域とホバー背景を項目テキストの外側まで広げるため）
const SUMMARY_ITEM_BUTTON_CLASS_NAME =
  "-m-2 flex w-full cursor-pointer flex-col rounded-md p-2 text-left transition-colors hover:bg-ink/5 active:bg-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const SHARE_APP_URL = "smile-compass.vercel.app";
const SHARE_TEXT = "smile compassで住まいの診断をしてみました🧭\n#smilecompass #住まい探し";

function buildTwitterIntentUrl(): string {
  const params = new URLSearchParams({ text: SHARE_TEXT, url: `https://${SHARE_APP_URL}` });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

function buildTwitterIntentUrlForLink(shareLink: string): string {
  const params = new URLSearchParams({ text: SHARE_TEXT, url: shareLink });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

function buildLineShareUrl(shareLink: string): string {
  const params = new URLSearchParams({ url: shareLink });
  return `https://social-plugins.line.me/lineit/share?${params.toString()}`;
}

/** 「X」を表すシンプルなロゴアイコン */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 2h3.4l-7.5 8.6L23.6 22h-6.9l-5.4-7-6.2 7H1.6l8-9.2L1 2h7l4.9 6.4L18.9 2Zm-1.2 18h1.9L7.4 3.9H5.3L17.7 20Z" />
    </svg>
  );
}

/** LINEのシンプルな吹き出しアイコン */
function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.48 2 2 5.69 2 10.24c0 4.08 3.56 7.5 8.37 8.14.33.07.77.22.88.5.1.26.07.66.03.92l-.14.86c-.04.26-.2 1 .88.55 1.08-.46 5.82-3.43 7.94-5.87C21.42 13.6 22 12 22 10.24 22 5.69 17.52 2 12 2Z" />
    </svg>
  );
}

/** クリップボードにコピーする操作を表すアイコン */
function CopyIcon({ className }: { className?: string }) {
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
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** コピー完了などの成功状態を表すチェックマークアイコン */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** パネルの開閉状態を表すシェブロン（下向き固定、開いたら回転させて使う） */
function ChevronIcon({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
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
  onNavigateToTab,
  loanScenarioSummary,
}: DiagnosisSummaryCardProps) {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showTwitterFallback, setShowTwitterFallback] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // SNSシェアパネルの開閉と、シェアリンク（金額はデフォルト非公開）
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [showAmountsInShare, setShowAmountsInShare] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareLinkError, setShareLinkError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [hazardResult, setHazardResult] = useState<HazardCheckResult | null>(null);
  const [isFetchingHazard, setIsFetchingHazard] = useState(false);
  const [isPreviewImageLoading, setIsPreviewImageLoading] = useState(false);
  // パネルを開いている間、所在地1件につき1回だけハザード簡易判定を行うための記録
  const hazardFetchedLocationRef = useRef<string | null>(null);

  const hasEnoughData = property.price > 0 && property.floorAreaSqm > 0;

  const pricePerTsubo = calculatePricePerTsuboManYen(property);
  const valuationResult =
    pricePerTsubo !== null && marketPricePerTsuboManYen > 0
      ? judgeValuation(pricePerTsubo, marketPricePerTsuboManYen)
      : null;

  const repayment = calculateLoanRepayment(property);
  const lifetimeCost = calculateLifetimeCostEstimate(property);

  // FPのサポートタブで固定/変動金利シナリオを比較済みの場合、有利なほうの数値をサマリーに反映する
  // （FPタブを一度も開いていない場合はnullのままなので、従来どおり固定金利の試算結果を使う）
  const displayedMonthlyPayment = loanScenarioSummary?.monthlyPayment ?? repayment.monthlyPayment;
  const displayedNetLifetimeCost = loanScenarioSummary?.netLifetimeCost ?? lifetimeCost.netLifetimeCost;
  const loanScenarioAnnotation = loanScenarioSummary ? LOAN_SCENARIO_ANNOTATION[loanScenarioSummary.mostAdvantageous] : null;

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

  // シェアカード・OGP画像用の所在地表示は、末尾の「（詳細は非公開）」を付けずすっきりさせる
  const shareLocationLabel = !trimmedLocation
    ? "所在地非公開"
    : showFullAddress
      ? trimmedLocation
      : (cityLevelLocation ?? "所在地非公開");

  const mortgageDeduction = simulateMortgageDeduction(property);

  // シェア用リンク（/share?d=...）とOGPプレビュー画像（/api/share-image?d=...）のURL。
  // shareCodeが確定するまではプレビューを表示しない
  const shareLink = shareCode ? `${window.location.origin}/share?d=${shareCode}` : null;
  const previewImageUrl = shareCode ? `/api/share-image?d=${shareCode}` : null;

  // shareCodeを作り直す（ハザード判定結果が未確定の間は「未確認」のまま先に作り、判定が確定次第作り直す）
  const rebuildShareCode = (hazard: HazardCheckResult | null) => {
    const summary: ShareSummary = {
      v: 1,
      loc: shareLocationLabel,
      date: issuedDate,
      judgment: valuationResult ? valuationResult.judgment : null,
      showAmounts: showAmountsInShare,
      ...(showAmountsInShare
        ? {
            pricePerTsubo: pricePerTsubo ?? undefined,
            marketPricePerTsubo: marketPricePerTsuboManYen > 0 ? marketPricePerTsuboManYen : undefined,
            monthlyPayment: repayment.monthlyPayment,
            netLifetimeCost: lifetimeCost.netLifetimeCost,
            loanDeductionTotal: mortgageDeduction.totalDeduction,
          }
        : {}),
      legalCount: legalChecklist.length,
      inspectionCount: inspectionChecklist.length,
      hazardFlood: hazard?.flood ?? "unknown",
      hazardSediment: hazard?.sediment ?? "unknown",
      hazardTsunami: hazard?.tsunami ?? "unknown",
    };

    try {
      setShareCode(encodeShareSummary(summary));
      setShareLinkError(null);
    } catch {
      setShareLinkError("シェアリンクの作成に失敗しました。もう一度お試しください。");
    }
  };

  // パネルを開いた直後・「金額を表示する」切り替え時・ハザード判定確定時に、プレビューを作り直す
  useEffect(() => {
    if (!isSharePanelOpen) return;
    // プレビュー画像のsrcが切り替わるため、読み込み完了までは薄く表示する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPreviewImageLoading(true);
    rebuildShareCode(hazardResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSharePanelOpen, showAmountsInShare, hazardResult]);

  // パネルを開いている間、所在地が変わるたびに1回だけハザード簡易判定を行う
  useEffect(() => {
    if (!isSharePanelOpen) return;

    if (!trimmedLocation) {
      if (hazardFetchedLocationRef.current !== null) {
        hazardFetchedLocationRef.current = null;
        setHazardResult(null);
      }
      return;
    }

    if (hazardFetchedLocationRef.current === trimmedLocation) return;

    let cancelled = false;
    setIsFetchingHazard(true);

    (async () => {
      let hazard: HazardCheckResult | null = null;
      try {
        const geocoded = await geocodeAddress(trimmedLocation);
        if (geocoded) hazard = await checkHazardAtPoint(geocoded.lat, geocoded.lon);
      } catch {
        hazard = null;
      }
      if (cancelled) return;
      hazardFetchedLocationRef.current = trimmedLocation;
      setHazardResult(hazard);
      setIsFetchingHazard(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isSharePanelOpen, trimmedLocation]);

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setShareLinkError("コピーに失敗しました。リンクを選択してコピーしてください。");
    }
  };

  if (!hasEnoughData) {
    return (
      <div className="mt-8 rounded-lg border border-ink/15 bg-white px-6 py-10 text-center text-sm text-ink/55">
        物件情報を入力すると診断サマリーが表示されます
      </div>
    );
  }

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
          onClick={() => setIsSharePanelOpen((prev) => !prev)}
          aria-expanded={isSharePanelOpen}
          className="flex min-h-12 touch-manipulation items-center gap-2 rounded-full bg-accent px-5 py-3 text-base font-bold text-white shadow-sm active:opacity-80"
        >
          <ShareIcon className="h-5 w-5 shrink-0" />
          診断結果をシェアする
          <ChevronIcon className={`h-4 w-4 shrink-0 transition-transform ${isSharePanelOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
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

      {isSharePanelOpen && (
        <div className="mb-6 rounded-lg border border-ink/15 bg-white px-6 py-6 sm:px-8 sm:py-7">
          <h3 className="font-heading text-lg text-ink">シェア方法を選ぶ</h3>
          <p className="mt-1 text-sm text-ink/55">
            物件のカルテをX・LINE・リンクでシェアできます。送る前に、どう見えるか下のプレビューで確認できます。
          </p>

          <label className="mt-4 flex items-center gap-2 text-sm text-ink/65">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink/25 text-accent focus:ring-accent"
              checked={showAmountsInShare}
              onChange={(e) => setShowAmountsInShare(e.target.checked)}
            />
            金額を表示する（坪単価・月々返済額・生涯コスト・住宅ローン控除額）
          </label>
          <p className="mt-1 text-xs text-ink/45">デフォルトは非公開です。世帯年収はこのシェア機能では送信されません。</p>

          <div className="mt-4">
            <p className="text-xs font-medium text-ink/55">プレビュー</p>
            <div className="relative mt-1 aspect-[1200/630] w-full overflow-hidden rounded-lg border border-ink/10 bg-ink/5">
              {previewImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- 動的に生成されるOGP画像のプレビューのため素のimgを使う
                <img
                  key={previewImageUrl}
                  src={previewImageUrl}
                  alt="シェア時にX・LINEなどで表示されるOGP画像のプレビュー"
                  onLoad={() => setIsPreviewImageLoading(false)}
                  onError={() => setIsPreviewImageLoading(false)}
                  className={`h-full w-full object-cover transition-opacity duration-200 ${
                    isPreviewImageLoading ? "opacity-0" : "opacity-100"
                  }`}
                />
              )}
              {isPreviewImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-ink/40">プレビューを作成中...</span>
                </div>
              )}
            </div>
            {isFetchingHazard && (
              <p className="mt-1 text-xs text-ink/40">周辺のハザード情報を確認しています...</p>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-ink/55">シェアリンク</p>
            <div className="mt-1 flex items-center gap-2 rounded-md border border-ink/15 bg-ink/5 px-3 py-2">
              <span className="flex-1 truncate text-xs text-ink/60">{shareLink ?? "リンクを準備しています..."}</span>
              <button
                type="button"
                onClick={handleCopyShareLink}
                disabled={!shareLink}
                aria-label="シェアリンクをコピー"
                className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-md text-ink/60 active:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {linkCopied ? <CheckIcon className="h-4 w-4 text-[#0b6b0b]" /> : <CopyIcon className="h-4 w-4" />}
              </button>
            </div>
            {linkCopied && <p className="mt-1 text-xs text-[#0b6b0b]">コピーしました</p>}
            {shareLinkError && <p className="mt-1 text-xs text-[#a12f2f]">{shareLinkError}</p>}
          </div>

          {shareLink && (
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={buildTwitterIntentUrlForLink(shareLink)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 touch-manipulation items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white active:opacity-80"
              >
                <XIcon className="h-4 w-4 shrink-0" />
                Xでシェア
              </a>
              <a
                href={buildLineShareUrl(shareLink)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 touch-manipulation items-center gap-2 rounded-full bg-[#06C755] px-4 py-2.5 text-sm font-bold text-white active:opacity-80"
              >
                <LineIcon className="h-4 w-4 shrink-0" />
                LINEでシェア
              </a>
            </div>
          )}

          <div className="mt-5 border-t border-ink/10 pt-4">
            <button
              type="button"
              onClick={handleShare}
              disabled={isGeneratingImage}
              className="flex min-h-11 touch-manipulation items-center gap-2 rounded-full border border-ink/20 bg-white px-4 py-2.5 text-sm font-medium text-ink/75 active:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShareIcon className="h-4 w-4 shrink-0" />
              {isGeneratingImage ? "画像を作成中..." : "画像を保存してシェアする"}
            </button>
            {imageError && <p className="mt-2 text-xs text-[#a12f2f]">{imageError}</p>}
            {showTwitterFallback && (
              <div className="mt-2 flex flex-col items-start gap-1">
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
          </div>
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

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <button type="button" onClick={() => onNavigateToTab("valuation")} className={SUMMARY_ITEM_BUTTON_CLASS_NAME}>
            <span className="flex items-center gap-1.5 text-xs text-ink/45">
              <RealtorFaceIcon className="h-5 w-5 shrink-0" />
              不動産プロのサポート｜坪単価判定
            </span>
            <span
              className={`mt-1 font-heading text-xl ${
                valuationResult ? JUDGMENT_STYLES[valuationResult.judgment] : "text-ink/35"
              }`}
            >
              {valuationResult ? VALUATION_JUDGMENT_LABELS[valuationResult.judgment] : "周辺相場を入力すると表示されます"}
            </span>
          </button>

          <button type="button" onClick={() => onNavigateToTab("fp")} className={SUMMARY_ITEM_BUTTON_CLASS_NAME}>
            <span className="flex items-center gap-1.5 text-xs text-ink/45">
              <FpAdvisorFaceIcon className="h-5 w-5 shrink-0" />
              FPのサポート｜月々返済額
            </span>
            <span className="mt-1 font-heading text-xl text-ink">
              {formatYen(displayedMonthlyPayment)}
              {loanScenarioAnnotation && (
                <span className="ml-1.5 font-sans text-xs font-normal text-ink/40">{loanScenarioAnnotation}</span>
              )}
            </span>
          </button>

          <button type="button" onClick={() => onNavigateToTab("fp")} className={SUMMARY_ITEM_BUTTON_CLASS_NAME}>
            <span className="flex items-center gap-1.5 text-xs text-ink/45">
              <FpAdvisorFaceIcon className="h-5 w-5 shrink-0" />
              FPのサポート｜生涯コストの目安
            </span>
            <span className="mt-1 font-heading text-xl text-ink">
              {formatYen(displayedNetLifetimeCost)}
              {loanScenarioAnnotation && (
                <span className="ml-1.5 font-sans text-xs font-normal text-ink/40">{loanScenarioAnnotation}</span>
              )}
            </span>
          </button>

          <button type="button" onClick={() => onNavigateToTab("legal")} className={SUMMARY_ITEM_BUTTON_CLASS_NAME}>
            <span className="flex items-center gap-1.5 text-xs text-ink/45">
              <span className="flex -space-x-1.5">
                <LegalAdvisorFaceIcon className="h-5 w-5 shrink-0 ring-2 ring-white" />
                <InspectorFaceIcon className="h-5 w-5 shrink-0 ring-2 ring-white" />
              </span>
              宅建士・住宅診断士のサポート｜要確認項目数
            </span>
            <span className="mt-1 font-heading text-xl text-ink">
              {legalChecklist.length + inspectionChecklist.length}項目
              <span className="ml-2 font-sans text-sm text-ink/50">
                （宅建士{legalChecklist.length}・診断士{inspectionChecklist.length}
                {inspectionPriorityCount > 0 ? `／優先${inspectionPriorityCount}` : ""}）
              </span>
            </span>
          </button>
        </div>

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
