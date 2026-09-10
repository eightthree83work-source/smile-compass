import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { HazardFlag, ShareSummary, decodeShareSummary } from "@/lib/shareSummary";
import { VALUATION_JUDGMENT_LABELS, ValuationJudgment } from "@/lib/valuation";

// このルートはURLのクエリパラメータ（d）から要約データを復元してOGP画像を生成するだけで、
// 外部のAPI・サービスには一切アクセスしない（フォントもリポジトリ同梱のファイルを読み込むのみ）。

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

const INK = "#1A2420";
const ACCENT = "#E8654A";
const CREAM = "#FBF6EC";
const BACKGROUND = "#F7F6F2";
const WHITE = "#FFFFFF";

const JUDGMENT_COLORS: Record<ValuationJudgment, string> = {
  undervalued: "#4A7856",
  reasonable: "#8A8A82",
  overvalued: "#C1503C",
};

const HAZARD_CATEGORY_LABELS = { flood: "洪水浸水", sediment: "土砂災害", tsunami: "津波浸水" } as const;

const HAZARD_STATUS_LABELS: Record<HazardFlag, string> = { yes: "該当あり", no: "該当なし", unknown: "未確認" };
const HAZARD_STATUS_COLORS: Record<HazardFlag, string> = {
  yes: "#C1503C",
  no: "#4A7856",
  unknown: "rgba(26,36,32,0.4)",
};

const yenFormatter = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
}

function loadFont(fileName: string): Buffer {
  return readFileSync(join(process.cwd(), "src", "app", "opengraph-fonts", fileName));
}

function CompassIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" fill={CREAM} stroke={INK} strokeWidth="4" />
      <line x1="50" y1="9" x2="50" y2="17" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <line x1="91" y1="50" x2="83" y2="50" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="91" x2="50" y2="83" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <line x1="9" y1="50" x2="17" y2="50" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <polygon points="50,28 64,56 36,56" fill={ACCENT} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="40" cy="64" r="3.6" fill={INK} />
      <circle cx="60" cy="64" r="3.6" fill={INK} />
      <path d="M38 74 Q50 83 62 74" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: WHITE,
        borderRadius: 16,
        padding: "16px 20px",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", fontSize: 15, color: "rgba(26,36,32,0.5)", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function HazardChip({ category, flag }: { category: keyof typeof HAZARD_CATEGORY_LABELS; flag: HazardFlag }) {
  const color = HAZARD_STATUS_COLORS[flag];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flex: 1,
        background: WHITE,
        borderRadius: 14,
        padding: "10px 16px",
      }}
    >
      <div style={{ display: "flex", width: 10, height: 10, borderRadius: 5, background: color }} />
      <div style={{ display: "flex", fontSize: 15, color: "rgba(26,36,32,0.6)", whiteSpace: "nowrap" }}>
        {HAZARD_CATEGORY_LABELS[category]}
      </div>
      <div style={{ display: "flex", fontSize: 16, fontWeight: 700, color, whiteSpace: "nowrap" }}>
        {HAZARD_STATUS_LABELS[flag]}
      </div>
    </div>
  );
}

function buildFallbackTitle(): string {
  return "smile compass ― 物件のカルテ";
}

function renderCard(summary: ShareSummary | null) {
  const judgmentColor = summary?.judgment ? JUDGMENT_COLORS[summary.judgment] : INK;
  const checklistTotal = (summary?.legalCount ?? 0) + (summary?.inspectionCount ?? 0);

  const diffPercent =
    summary?.showAmounts && summary.pricePerTsubo !== undefined && summary.marketPricePerTsubo
      ? ((summary.pricePerTsubo - summary.marketPricePerTsubo) / summary.marketPricePerTsubo) * 100
      : null;

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
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 340,
          height: 340,
          borderRadius: 170,
          background: "rgba(232,101,74,0.14)",
        }}
      />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 8, background: ACCENT }} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "32px 64px 28px",
          fontFamily: "Noto Sans JP",
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <CompassIcon size={52} />
            <div
              style={{
                display: "flex",
                fontSize: 30,
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
              <div style={{ display: "flex", fontSize: 12, color: "rgba(26,36,32,0.45)", whiteSpace: "nowrap" }}>
                診断日
              </div>
              <div style={{ display: "flex", fontSize: 16, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>
                {summary.date}
              </div>
            </div>
          )}
        </div>

        {summary ? (
          <div style={{ display: "flex", flexDirection: "column", width: "100%", flex: 1 }}>
            <div
              style={{
                display: "flex",
                width: "100%",
                fontSize: 34,
                fontWeight: 800,
                color: INK,
                fontFamily: "Shippori Mincho",
                marginTop: 24,
                whiteSpace: "nowrap",
              }}
            >
              {summary.loc}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                width: "100%",
                alignItems: "center",
                gap: 16,
                marginTop: 44,
              }}
            >
              {summary.judgment ? (
                <div
                  style={{
                    display: "flex",
                    background: judgmentColor,
                    color: WHITE,
                    fontSize: 22,
                    fontWeight: 700,
                    padding: "8px 26px",
                    borderRadius: 26,
                    whiteSpace: "nowrap",
                  }}
                >
                  坪単価判定：{VALUATION_JUDGMENT_LABELS[summary.judgment]}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    background: "rgba(26,36,32,0.08)",
                    color: "rgba(26,36,32,0.55)",
                    fontSize: 18,
                    padding: "8px 22px",
                    borderRadius: 26,
                    whiteSpace: "nowrap",
                  }}
                >
                  4人の専門家が住まい選びをサポート
                </div>
              )}
              {diffPercent !== null && (
                <div style={{ display: "flex", fontSize: 18, color: "rgba(26,36,32,0.6)", whiteSpace: "nowrap" }}>
                  周辺相場より{diffPercent > 0 ? "+" : ""}
                  {diffPercent.toFixed(1)}%
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "row", width: "100%", gap: 16, marginTop: 22 }}>
              <StatTile
                label="月々返済額"
                value={summary.showAmounts && summary.monthlyPayment !== undefined ? formatYen(summary.monthlyPayment) : "非公開"}
              />
              <StatTile
                label="生涯コストの目安"
                value={
                  summary.showAmounts && summary.netLifetimeCost !== undefined ? formatYen(summary.netLifetimeCost) : "非公開"
                }
              />
              <StatTile
                label="住宅ローン控除の総額"
                value={
                  summary.showAmounts && summary.loanDeductionTotal !== undefined
                    ? formatYen(summary.loanDeductionTotal)
                    : "非公開"
                }
              />
            </div>

            <div style={{ display: "flex", flexDirection: "row", width: "100%", gap: 14, marginTop: 14 }}>
              <HazardChip category="flood" flag={summary.hazardFlood} />
              <HazardChip category="sediment" flag={summary.hazardSediment} />
              <HazardChip category="tsunami" flag={summary.hazardTsunami} />
            </div>

            <div
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                marginTop: 14,
                fontSize: 14,
                color: "rgba(26,36,32,0.45)",
                whiteSpace: "nowrap",
              }}
            >
              宅建士・住宅診断士の要確認項目：{checklistTotal}件／ハザードは簡易判定の参考情報です
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div
              style={{
                display: "flex",
                fontSize: 40,
                fontWeight: 800,
                color: INK,
                fontFamily: "Shippori Mincho",
                whiteSpace: "nowrap",
              }}
            >
              {buildFallbackTitle()}
            </div>
            <div style={{ display: "flex", fontSize: 20, color: "rgba(26,36,32,0.6)", marginTop: 12, whiteSpace: "nowrap" }}>
              不動産屋・宅建士・住宅診断士・FPの4つの視点でセルフ診断できるアプリです
            </div>
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
            padding: "18px 0",
            fontSize: 22,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          無料で診断してみる → smile-compass.vercel.app
        </div>
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("d");
  const summary = code ? decodeShareSummary(code) : null;

  const [shipporiMincho, notoSansJp] = await Promise.all([
    loadFont("ShipporiMincho-800-share-full.woff"),
    loadFont("NotoSansJP-700-share-full.woff"),
  ]);

  return new ImageResponse(renderCard(summary), {
    ...SIZE,
    fonts: [
      { name: "Shippori Mincho", data: shipporiMincho, weight: 800, style: "normal" },
      { name: "Noto Sans JP", data: notoSansJp, weight: 700, style: "normal" },
    ],
  });
}
