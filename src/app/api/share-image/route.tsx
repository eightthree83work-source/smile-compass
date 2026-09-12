import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { REPAYMENT_BURDEN_CHARACTER_COMMENTS, REPAYMENT_BURDEN_TIER_LABELS, RepaymentBurdenLevel } from "@/lib/affordability";
import { HazardFlag, ShareSummary, decodeShareSummary } from "@/lib/shareSummary";
import {
  VALUATION_JUDGMENT_COMMENTS,
  VALUATION_JUDGMENT_LABELS,
  ValuationJudgment,
} from "@/lib/valuation";

// このルートはURLのクエリパラメータ（d）から要約データを復元してOGP画像を生成するだけで、
// 外部のAPI・サービスには一切アクセスしない（フォント・キャラクター画像もリポジトリ同梱のファイルを読み込むのみ）。

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

const INK = "#1A2420";
const ACCENT = "#E8654A";
const CREAM = "#FBF6EC";
const BACKGROUND = "#F7F6F2";
const WHITE = "#FFFFFF";
const NEUTRAL = "#8A8A82";
const GREEN = "#3F7355";
const RED = "#B84632";

// ---------------------------------------------------------------------------
// 「主役」となる診断結果の選定
// ---------------------------------------------------------------------------
// 坪単価判定・返済負担率のうち、より「振れ幅」が大きい（＝妥当/良好といった中間的な
// 判定ではない）ほうを画像の主役に採用する。両方が中間的、またはどちらも未取得の場合は
// 坪単価判定を優先し、それも無ければ主役なし（汎用の案内カードにフォールバック）とする。

type HeroResult =
  | { kind: "valuation"; judgment: ValuationJudgment; diffPercent: number | null }
  | { kind: "burden"; level: RepaymentBurdenLevel; ratioPercent: number | null };

const VALUATION_IMPACT_SCORE: Record<ValuationJudgment, number> = { undervalued: 2, overvalued: 2, reasonable: 0 };
const BURDEN_IMPACT_SCORE: Record<RepaymentBurdenLevel, number> = { risk: 3, comfortable: 2, caution: 1, reasonable: 0 };

function pickHeroResult(summary: ShareSummary): HeroResult | null {
  const hasValuation = summary.judgment !== null;
  const hasBurden = summary.burdenLevel !== undefined;

  if (hasValuation && !hasBurden) {
    return { kind: "valuation", judgment: summary.judgment as ValuationJudgment, diffPercent: summary.diffPercent ?? null };
  }
  if (!hasValuation && hasBurden) {
    return { kind: "burden", level: summary.burdenLevel as RepaymentBurdenLevel, ratioPercent: summary.burdenRatioPercent ?? null };
  }
  if (hasValuation && hasBurden) {
    const valuationScore = VALUATION_IMPACT_SCORE[summary.judgment as ValuationJudgment];
    const burdenScore = BURDEN_IMPACT_SCORE[summary.burdenLevel as RepaymentBurdenLevel];
    return valuationScore >= burdenScore
      ? { kind: "valuation", judgment: summary.judgment as ValuationJudgment, diffPercent: summary.diffPercent ?? null }
      : { kind: "burden", level: summary.burdenLevel as RepaymentBurdenLevel, ratioPercent: summary.burdenRatioPercent ?? null };
  }
  return null;
}

const VALUATION_HERO_COLORS: Record<ValuationJudgment, string> = {
  undervalued: GREEN,
  reasonable: NEUTRAL,
  overvalued: RED,
};
const BURDEN_HERO_COLORS: Record<RepaymentBurdenLevel, string> = {
  comfortable: GREEN,
  reasonable: NEUTRAL,
  caution: ACCENT,
  risk: RED,
};

const VALUATION_CTA_COPY: Record<ValuationJudgment, string> = {
  undervalued: "この物件、実は掘り出し物？",
  reasonable: "この物件、あなたなら買う？",
  overvalued: "あなたの物件は買い？それとも様子見？",
};
const BURDEN_CTA_COPY: Record<RepaymentBurdenLevel, string> = {
  comfortable: "この返済額、家計にやさしいって知ってた？",
  reasonable: "あなたの返済プラン、無理なくいけてる？",
  caution: "その返済額、本当に無理なくいける？",
  risk: "この返済額、本当に大丈夫？",
};
const FALLBACK_CTA_TEXT = "無料で診断してみる";

interface HeroContent {
  color: string;
  categoryLabel: string;
  bigText: string;
  supportingText: string | null;
  comment: string;
  characterKind: "dog" | "squirrel";
  ctaCopy: string;
}

function buildHeroContent(hero: HeroResult | null): HeroContent {
  if (!hero) {
    return {
      color: ACCENT,
      categoryLabel: "smile compass",
      bigText: "物件のカルテ",
      supportingText: null,
      comment: "4人の専門家があなたの住まい選びをサポートするよ！",
      characterKind: "dog",
      ctaCopy: FALLBACK_CTA_TEXT,
    };
  }

  if (hero.kind === "valuation") {
    return {
      color: VALUATION_HERO_COLORS[hero.judgment],
      categoryLabel: "不動産プロの坪単価判定",
      bigText: VALUATION_JUDGMENT_LABELS[hero.judgment],
      supportingText:
        hero.diffPercent !== null ? `周辺相場より${hero.diffPercent > 0 ? "+" : ""}${hero.diffPercent.toFixed(1)}%` : null,
      comment: VALUATION_JUDGMENT_COMMENTS[hero.judgment],
      characterKind: "dog",
      ctaCopy: VALUATION_CTA_COPY[hero.judgment],
    };
  }

  return {
    color: BURDEN_HERO_COLORS[hero.level],
    categoryLabel: "FPが見る返済負担率の目安",
    bigText: REPAYMENT_BURDEN_TIER_LABELS[hero.level],
    supportingText: hero.ratioPercent !== null ? `返済負担率 ${hero.ratioPercent.toFixed(1)}%` : null,
    comment: REPAYMENT_BURDEN_CHARACTER_COMMENTS[hero.level],
    characterKind: "squirrel",
    ctaCopy: BURDEN_CTA_COPY[hero.level],
  };
}

// ---------------------------------------------------------------------------
// ハザード（洪水・土砂災害・津波）は3種を個別に見せず、1件でも該当があれば
// 「該当あり」に丸めた1つの指標として、主役を邪魔しない脇役の情報にする
// ---------------------------------------------------------------------------

function combineHazardStatus(summary: ShareSummary): HazardFlag {
  const flags = [summary.hazardFlood, summary.hazardSediment, summary.hazardTsunami];
  if (flags.includes("yes")) return "yes";
  if (flags.every((flag) => flag === "no")) return "no";
  return "unknown";
}

const HAZARD_STATUS_LABELS: Record<HazardFlag, string> = { yes: "該当あり", no: "該当なし", unknown: "未確認" };
const HAZARD_STATUS_COLORS: Record<HazardFlag, string> = { yes: RED, no: GREEN, unknown: "rgba(26,36,32,0.4)" };

const yenFormatter = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
}

function loadFont(fileName: string): Buffer {
  return readFileSync(join(process.cwd(), "src", "app", "opengraph-fonts", fileName));
}

/** キャラクターPNGをOGP画像に埋め込めるサイズまで縮小し、data URLにする */
async function loadCharacterDataUrl(kind: "dog" | "squirrel"): Promise<string> {
  const fileName = kind === "dog" ? "realtor-dog.png" : "fp-squirrel.png";
  const filePath = join(process.cwd(), "public", "characters", fileName);
  const buffer = readFileSync(filePath);
  const resized = await sharp(buffer).resize(320, 320).png().toBuffer();
  return `data:image/png;base64,${resized.toString("base64")}`;
}

function CompassIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" fill={CREAM} stroke={INK} strokeWidth="4" />
      <line x1="50" y1="9" x2="50" y2="17" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <line x1="91" y1="50" x2="83" y2="50" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="91" x2="50" y2="83" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <line x1="9" y1="50" x2="17" y2="50" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <polygon points="50,28 64,56 36,56" fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="40" cy="64" r="3.6" fill={INK} />
      <circle cx="60" cy="64" r="3.6" fill={INK} />
      <path d="M38 74 Q50 83 62 74" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}

function MiniStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: WHITE,
        borderRadius: 14,
        padding: "12px 18px",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", fontSize: 14, color: "rgba(26,36,32,0.5)", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: valueColor ?? INK, whiteSpace: "nowrap" }}>
        {value}
      </div>
    </div>
  );
}

async function renderCard(summary: ShareSummary | null) {
  const hero = summary ? pickHeroResult(summary) : null;
  const heroContent = buildHeroContent(hero);
  const characterDataUrl = await loadCharacterDataUrl(heroContent.characterKind);
  const checklistTotal = (summary?.legalCount ?? 0) + (summary?.inspectionCount ?? 0);
  const hazardStatus = summary ? combineHazardStatus(summary) : "unknown";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BACKGROUND,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 判定結果のトーンに応じて色を変える、背景の淡いウォッシュ（クリーム地のベースは維持） */}
      <div
        style={{
          position: "absolute",
          top: -140,
          right: -140,
          width: 420,
          height: 420,
          borderRadius: 210,
          background: heroContent.color,
          opacity: 0.16,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 280,
          height: 280,
          borderRadius: 140,
          background: heroContent.color,
          opacity: 0.08,
        }}
      />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 10, background: heroContent.color }} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "26px 60px 24px",
          fontFamily: "Noto Sans JP",
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CompassIcon size={40} color={heroContent.color} />
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 800,
                color: INK,
                fontFamily: "Shippori Mincho",
                whiteSpace: "nowrap",
              }}
            >
              smile compass
            </div>
          </div>
          {summary && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 12, color: "rgba(26,36,32,0.45)", whiteSpace: "nowrap" }}>診断日</div>
              <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>
                {summary.date}
              </div>
            </div>
          )}
        </div>

        {summary && (
          <div
            style={{
              display: "flex",
              width: "100%",
              fontSize: 22,
              fontWeight: 700,
              color: "rgba(26,36,32,0.6)",
              marginTop: 8,
              whiteSpace: "nowrap",
            }}
          >
            {summary.loc}
          </div>
        )}

        {/* 主役ゾーン：判定結果を最大級の文字サイズ・強いコントラストで見せ、
            キャラクターの一言コメントでブランドの個性を添える */}
        <div style={{ display: "flex", flexDirection: "row", width: "100%", alignItems: "center", marginTop: 14, gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 19, fontWeight: 700, color: heroContent.color, whiteSpace: "nowrap" }}>
              {heroContent.categoryLabel}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 124,
                lineHeight: 1,
                fontWeight: 800,
                color: heroContent.color,
                fontFamily: "Shippori Mincho",
                marginTop: 6,
                whiteSpace: "nowrap",
              }}
            >
              {heroContent.bigText}
            </div>
            {heroContent.supportingText && (
              <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: INK, marginTop: 6, whiteSpace: "nowrap" }}>
                {heroContent.supportingText}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 340 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) requires a plain <img>, not next/image */}
            <img src={characterDataUrl} width={170} height={170} alt="" style={{ objectFit: "contain" }} />
            <div
              style={{
                position: "relative",
                display: "flex",
                marginTop: 14,
                background: WHITE,
                border: `2px solid ${INK}`,
                borderRadius: 20,
                padding: "14px 18px",
                fontSize: 18,
                lineHeight: 1.35,
                color: INK,
                textAlign: "center",
              }}
            >
              {heroContent.comment}
            </div>
          </div>
        </div>

        {summary && (
          <div style={{ display: "flex", flexDirection: "row", width: "100%", gap: 14, marginTop: 20 }}>
            <MiniStat
              label="月々返済額"
              value={summary.showAmounts && summary.monthlyPayment !== undefined ? formatYen(summary.monthlyPayment) : "非公開"}
            />
            <MiniStat label="ハザード" value={HAZARD_STATUS_LABELS[hazardStatus]} valueColor={HAZARD_STATUS_COLORS[hazardStatus]} />
            <MiniStat label="要確認項目" value={`${checklistTotal}件`} />
          </div>
        )}

        {!summary && (
          <div style={{ display: "flex", fontSize: 20, color: "rgba(26,36,32,0.6)", marginTop: 16, whiteSpace: "nowrap" }}>
            不動産プロ・宅建士・住宅診断士・FPの4つの視点でセルフ診断できるアプリです
          </div>
        )}

        <div style={{ display: "flex", flex: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: INK,
            color: WHITE,
            borderRadius: 16,
            padding: "16px 0",
            fontSize: 22,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {heroContent.ctaCopy} → smile-compass.vercel.app
        </div>
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("d");
  const summary = code ? decodeShareSummary(code) : null;

  const [shipporiMincho, notoSansJp, card] = await Promise.all([
    loadFont("ShipporiMincho-800-share-full.woff"),
    loadFont("NotoSansJP-700-share-full.woff"),
    renderCard(summary),
  ]);

  return new ImageResponse(card, {
    ...SIZE,
    fonts: [
      { name: "Shippori Mincho", data: shipporiMincho, weight: 800, style: "normal" },
      { name: "Noto Sans JP", data: notoSansJp, weight: 700, style: "normal" },
    ],
  });
}
