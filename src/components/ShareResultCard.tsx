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

/** SNSのタイムラインで目に留まるようにする一言。他の候補は完了報告に記載 */
const CATCH_COPY = "この物件、プロならこう診断する";

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

/** 背景の間延びを防ぐための、コンパスの目盛りを模した薄い装飾（透かし） */
function CompassWatermark({ size, opacity, style }: { size: number; opacity: number; style?: React.CSSProperties }) {
  const ticks = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", ...style }}>
      <circle cx="50" cy="50" r="47" fill="none" stroke={INK} strokeOpacity={opacity} strokeWidth="1.4" />
      <circle cx="50" cy="50" r="36" fill="none" stroke={INK} strokeOpacity={opacity} strokeWidth="1" />
      {ticks.map((angle, i) => (
        <line
          key={i}
          x1={50 + 47 * Math.cos(angle)}
          y1={50 + 47 * Math.sin(angle)}
          x2={50 + 40 * Math.cos(angle)}
          y2={50 + 40 * Math.sin(angle)}
          stroke={INK}
          strokeOpacity={opacity}
          strokeWidth="1.6"
        />
      ))}
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
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: WHITE, borderRadius: 18, padding: "18px 20px", gap: 4 }}>
      <div style={{ display: "flex", marginLeft: icons.length > 1 ? 10 : 0 }}>
        {icons.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- html-to-imageでのキャプチャ対象のため素のimgを使う
          <img
            key={src}
            src={src}
            alt=""
            width={44}
            height={44}
            style={{ borderRadius: 22, border: `2px solid ${WHITE}`, marginLeft: index > 0 ? -14 : 0 }}
          />
        ))}
      </div>
      <div style={{ fontSize: 15, color: "rgba(26,36,32,0.55)", marginTop: 6 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 700, color: INK, lineHeight: 1.15 }}>{value}</div>
      {caption && <div style={{ fontSize: 12, color: "rgba(26,36,32,0.45)" }}>{caption}</div>}
    </div>
  );
}

function ComparisonBar({ label, valueLabel, percent, color }: { label: string; valueLabel: string; percent: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
      <div style={{ width: 110, fontSize: 15, color: "rgba(26,36,32,0.6)", flexShrink: 0, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ display: "flex", flex: 1, height: 24, background: "rgba(26,36,32,0.08)", borderRadius: 12 }}>
        <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: 12 }} />
      </div>
      <div
        style={{
          width: 175,
          fontSize: 15,
          fontWeight: 700,
          color: INK,
          textAlign: "right",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {valueLabel}
      </div>
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
        height: 1080,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <div
        ref={cardRef}
        className={`${shipporiMincho.className} ${notoSansJp.className}`}
        style={{
          width: 1200,
          height: 1080,
          display: "flex",
          flexDirection: "column",
          background: BACKGROUND,
          position: "relative",
          padding: "0 56px",
          fontFamily: notoSansJp.style.fontFamily,
          overflow: "hidden",
        }}
      >
        {/* コーナーのアクセント装飾 */}
        <div
          style={{
            position: "absolute",
            top: -130,
            right: -130,
            width: 400,
            height: 400,
            borderRadius: 200,
            background: "rgba(232,101,74,0.14)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -90,
            left: -90,
            width: 260,
            height: 260,
            borderRadius: 130,
            background: "rgba(26,36,32,0.06)",
          }}
        />
        {/* 下部の余白を埋めるコンパスの目盛り透かし */}
        <CompassWatermark size={520} opacity={0.05} style={{ bottom: -160, right: -80 }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 10, background: ACCENT }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <CompassIcon size={78} />
            <div style={{ fontSize: 48, fontWeight: 800, color: INK, fontFamily: shipporiMincho.style.fontFamily }}>
              smile compass
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 13, color: "rgba(26,36,32,0.45)" }}>診断日</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>{issuedDate}</div>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: ACCENT, marginTop: 22, lineHeight: 1.3 }}>
          {CATCH_COPY}
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(26,36,32,0.7)", marginTop: 26 }}>{displayedLocation}</div>

        <div style={{ width: "100%", height: 1, background: "rgba(26,36,32,0.12)", marginTop: 18 }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: WHITE,
            borderRadius: 24,
            padding: "26px 36px",
            marginTop: 20,
            gap: 12,
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
                  fontSize: 42,
                  fontWeight: 700,
                  padding: "16px 48px",
                  borderRadius: 44,
                }}
              >
                {JUDGMENT_LABELS[valuationResult.judgment]}
              </div>
              <div style={{ display: "flex", gap: 40, marginTop: 6, fontSize: 18, color: INK }}>
                <div style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                  あなたの物件: {ownPricePerTsubo.toFixed(1)}万円/坪
                </div>
                <div style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                  周辺相場: {marketPricePerTsuboManYen.toFixed(1)}万円/坪
                </div>
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, color: judgmentColor, marginTop: 2 }}>
                相場より{Math.abs(valuationResult.diffPercent).toFixed(1)}%{JUDGMENT_LABELS[valuationResult.judgment]}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
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

        <div style={{ display: "flex", gap: 18, marginTop: 20 }}>
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

        <div style={{ display: "flex", justifyContent: "center", fontSize: 19, fontWeight: 700, color: "rgba(26,36,32,0.6)", marginTop: 26 }}>
          4人の専門家があなたをサポート
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 12 }}>
          {[
            { src: "/characters/tab-icons/realtor-dog-face.png", role: "不動産プロ" },
            { src: "/characters/tab-icons/legal-owl-face.png", role: "宅建士" },
            { src: "/characters/tab-icons/inspector-mole-face.png", role: "住宅診断士" },
            { src: "/characters/tab-icons/fp-squirrel-face.png", role: "FP" },
          ].map(({ src, role }) => (
            <div key={src} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 112 }}>
              <div
                style={{
                  display: "flex",
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  overflow: "hidden",
                  border: `4px solid ${INK}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- html-to-imageでのキャプチャ対象のため素のimgを使う */}
                <img src={src} alt="" width={96} height={96} style={{ objectFit: "cover" }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(26,36,32,0.7)", whiteSpace: "nowrap" }}>{role}</div>
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
            borderRadius: 20,
            padding: "24px 0",
            marginTop: 26,
            marginBottom: 40,
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          無料で診断してみる → smile-compass.vercel.app
        </div>
      </div>
    </div>
  );
}
