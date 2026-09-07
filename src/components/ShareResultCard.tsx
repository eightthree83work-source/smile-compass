import localFont from "next/font/local";
import { ValuationJudgment, ValuationResult } from "@/lib/valuation";

// シェア画像専用カード。html-to-imageでキャプチャする際、Tailwindのoklch()カラーが
// 正しく解釈されずに色が抜け落ちる問題があったため、Tailwindクラスは一切使わず
// style属性のインラインスタイル（#RRGGBB形式の16進色のみ）でスタイリングしている。

const shipporiMincho = localFont({
  src: "../fonts/ShipporiMincho-800-share.woff",
  weight: "800",
  display: "swap",
});

const notoSansJp = localFont({
  src: "../fonts/NotoSansJP-700-share.woff",
  weight: "700",
  display: "swap",
});

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

const JUDGMENT_LABELS: Record<ValuationJudgment, string> = {
  undervalued: "割安",
  reasonable: "適正",
  overvalued: "割高",
};

export interface ShareResultCardProps {
  displayedLocation: string;
  issuedDate: string;
  ownPricePerTsubo: number | null;
  marketPricePerTsuboManYen: number;
  valuationResult: ValuationResult | null;
  monthlyPayment: number;
  netLifetimeCost: number;
  legalChecklistCount: number;
  inspectionChecklistCount: number;
}

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
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

function StatCard({
  icons,
  label,
  value,
  caption,
}: {
  icons: string[];
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: WHITE, borderRadius: 16, padding: "20px 22px", gap: 6 }}>
      <div style={{ display: "flex", marginLeft: icons.length > 1 ? 8 : 0 }}>
        {icons.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- html-to-imageでのキャプチャ対象のため素のimgを使う
          <img
            key={src}
            src={src}
            alt=""
            width={40}
            height={40}
            style={{ borderRadius: 20, border: `2px solid ${WHITE}`, marginLeft: index > 0 ? -12 : 0 }}
          />
        ))}
      </div>
      <div style={{ fontSize: 14, color: "rgba(26,36,32,0.55)", marginTop: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: INK, lineHeight: 1.2 }}>{value}</div>
      {caption && <div style={{ fontSize: 12, color: "rgba(26,36,32,0.45)" }}>{caption}</div>}
    </div>
  );
}

function ComparisonBar({ label, valueLabel, percent, color }: { label: string; valueLabel: string; percent: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
      <div style={{ width: 110, fontSize: 15, color: "rgba(26,36,32,0.6)", flexShrink: 0 }}>{label}</div>
      <div style={{ display: "flex", flex: 1, height: 20, background: "rgba(26,36,32,0.08)", borderRadius: 10 }}>
        <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: 10 }} />
      </div>
      <div style={{ width: 140, fontSize: 15, fontWeight: 700, color: INK, textAlign: "right", flexShrink: 0 }}>{valueLabel}</div>
    </div>
  );
}

/**
 * SNSシェア用の診断結果カード。通常は画面に表示せず、シェア実行時だけ
 * position:absolute; left:-9999px で画面外にレンダリングし、html-to-imageで
 * キャプチャした後は呼び出し側でアンマウントする（display:noneだと
 * html-to-imageが正しくキャプチャできないため、画面外配置にしている）。
 */
export default function ShareResultCard({
  cardRef,
  displayedLocation,
  issuedDate,
  ownPricePerTsubo,
  marketPricePerTsuboManYen,
  valuationResult,
  monthlyPayment,
  netLifetimeCost,
  legalChecklistCount,
  inspectionChecklistCount,
}: ShareResultCardProps & { cardRef: React.RefObject<HTMLDivElement | null> }) {
  const judgmentColor = valuationResult ? JUDGMENT_COLORS[valuationResult.judgment] : INK;
  const maxTsubo = valuationResult && ownPricePerTsubo ? Math.max(ownPricePerTsubo, marketPricePerTsuboManYen) : 0;
  const checklistTotal = legalChecklistCount + inspectionChecklistCount;

  return (
    <div
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: 1200,
        height: 980,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <div
        ref={cardRef}
        className={`${shipporiMincho.className} ${notoSansJp.className}`}
        style={{
          width: 1200,
          height: 980,
          display: "flex",
          flexDirection: "column",
          background: BACKGROUND,
          position: "relative",
          padding: "0 56px",
          fontFamily: notoSansJp.style.fontFamily,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 360,
            height: 360,
            borderRadius: 180,
            background: "rgba(232,101,74,0.12)",
          }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 8, background: ACCENT }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <CompassIcon size={56} />
            <div style={{ fontSize: 34, fontWeight: 800, color: INK, fontFamily: shipporiMincho.style.fontFamily }}>
              smile compass
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 13, color: "rgba(26,36,32,0.45)" }}>診断日</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>{issuedDate}</div>
          </div>
        </div>

        <div style={{ fontSize: 24, fontWeight: 700, color: INK, marginTop: 20 }}>{displayedLocation}</div>

        <div style={{ width: "100%", height: 1, background: "rgba(26,36,32,0.12)", marginTop: 24 }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: WHITE,
            borderRadius: 20,
            padding: "28px 32px",
            marginTop: 28,
            gap: 14,
          }}
        >
          <div style={{ fontSize: 15, color: "rgba(26,36,32,0.5)" }}>不動産プロのサポート・坪単価判定</div>

          {valuationResult && ownPricePerTsubo ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  background: judgmentColor,
                  color: WHITE,
                  fontSize: 28,
                  fontWeight: 700,
                  padding: "10px 32px",
                  borderRadius: 32,
                }}
              >
                {JUDGMENT_LABELS[valuationResult.judgment]}
              </div>
              <div style={{ display: "flex", gap: 32, marginTop: 4, fontSize: 18, color: INK }}>
                <div>あなたの物件: {ownPricePerTsubo.toFixed(1)}万円/坪</div>
                <div>周辺相場: {marketPricePerTsuboManYen.toFixed(1)}万円/坪</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: judgmentColor }}>
                相場より{Math.abs(valuationResult.diffPercent).toFixed(1)}%{JUDGMENT_LABELS[valuationResult.judgment]}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                <ComparisonBar
                  label="あなたの物件"
                  valueLabel={`${ownPricePerTsubo.toFixed(1)}万円/坪`}
                  percent={(ownPricePerTsubo / maxTsubo) * 100}
                  color={INK}
                />
                <ComparisonBar
                  label="周辺相場"
                  valueLabel={`${marketPricePerTsuboManYen.toFixed(1)}万円/坪`}
                  percent={(marketPricePerTsuboManYen / maxTsubo) * 100}
                  color="rgba(26,36,32,0.35)"
                />
              </div>
            </>
          ) : (
            <div style={{ fontSize: 18, color: "rgba(26,36,32,0.4)", padding: "12px 0" }}>
              周辺相場を入力すると坪単価判定が表示されます
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
          <StatCard icons={["/characters/tab-icons/fp-squirrel-face.png"]} label="月々返済額" value={formatYen(monthlyPayment)} />
          <StatCard
            icons={["/characters/tab-icons/fp-squirrel-face.png"]}
            label="生涯コストの目安"
            value={formatYen(netLifetimeCost)}
          />
          <StatCard
            icons={["/characters/tab-icons/legal-owl-face.png", "/characters/tab-icons/inspector-mole-face.png"]}
            label="要確認項目数"
            value={`${checklistTotal}項目`}
            caption={`宅建士${legalChecklistCount}・診断士${inspectionChecklistCount}`}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 28 }}>
          {[
            "/characters/tab-icons/realtor-dog-face.png",
            "/characters/tab-icons/legal-owl-face.png",
            "/characters/tab-icons/inspector-mole-face.png",
            "/characters/tab-icons/fp-squirrel-face.png",
          ].map((src) => (
            <div
              key={src}
              style={{
                display: "flex",
                width: 72,
                height: 72,
                borderRadius: 36,
                overflow: "hidden",
                border: `3px solid ${INK}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- html-to-imageでのキャプチャ対象のため素のimgを使う */}
              <img src={src} alt="" width={72} height={72} style={{ objectFit: "cover" }} />
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            background: INK,
            color: WHITE,
            borderRadius: 16,
            padding: "20px 0",
            marginTop: 28,
            marginBottom: 40,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          無料で診断してみる → smile-compass.vercel.app
        </div>
      </div>
    </div>
  );
}
