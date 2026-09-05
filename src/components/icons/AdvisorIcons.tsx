import { ReactNode } from "react";

interface AdvisorIconProps {
  className?: string;
}

const DEFAULT_LEFT_ARM = "M21 38 Q10 42 9 52";
const DEFAULT_RIGHT_ARM = "M43 38 Q54 42 55 52";

/** 4キャラクター共通の頭・胴体・腕。線画のみ（塗りなし）で統一する */
function PersonBase({
  leftArm = DEFAULT_LEFT_ARM,
  rightArm = DEFAULT_RIGHT_ARM,
  children,
}: {
  leftArm?: string;
  rightArm?: string;
  children?: ReactNode;
}) {
  return (
    <>
      <circle cx="32" cy="17" r="8" />
      {/* 表情：目は小さな点2つ、口は短いカーブ */}
      <circle cx="29" cy="16" r="0.9" className="fill-current" stroke="none" />
      <circle cx="35" cy="16" r="0.9" className="fill-current" stroke="none" />
      <path d="M29 20.5 Q32 22.5 35 20.5" />
      <path d="M18 56 Q18 33 32 33 Q46 33 46 56" />
      <path d={leftArm} />
      <path d={rightArm} />
      {children}
    </>
  );
}

function IconSvg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** 不動産屋：メジャーと住宅の模型を持つ人物 */
export function RealtorIcon({ className }: AdvisorIconProps) {
  return (
    <IconSvg className={className}>
      <PersonBase>
        <circle cx="9" cy="52" r="6.5" />
        <rect x="14.5" y="50" width="3" height="3" />
        <circle cx="9" cy="52" r="2" className="fill-accent" stroke="none" />
        <rect x="48" y="52" width="14" height="8" />
        <path d="M46 52 L55 44 L64 52" />
        <rect x="53" y="55" width="4" height="5" className="fill-accent" stroke="none" />
      </PersonBase>
    </IconSvg>
  );
}

/** 宅建士：判子と書類を持つ人物 */
export function LegalAdvisorIcon({ className }: AdvisorIconProps) {
  return (
    <IconSvg className={className}>
      <PersonBase>
        <path d="M2 44 L12 44 L17 49 L17 60 L2 60 Z" />
        <path d="M12 44 L12 49 L17 49" />
        <line x1="5" y1="52" x2="14" y2="52" />
        <line x1="5" y1="56" x2="12" y2="56" />
        <rect x="51" y="42" width="6" height="9" rx="2" />
        <ellipse cx="54" cy="54" rx="7" ry="3.5" />
        <ellipse cx="54" cy="54" rx="4" ry="2" className="fill-accent" stroke="none" />
      </PersonBase>
    </IconSvg>
  );
}

/** 住宅診断士：ヘルメットと虫眼鏡を持つ人物 */
export function InspectorIcon({ className }: AdvisorIconProps) {
  return (
    <IconSvg className={className}>
      <PersonBase leftArm="M21 38 Q17 46 18 54">
        <path d="M22 17 A10 10 0 0 1 42 17" />
        <line x1="20" y1="17" x2="44" y2="17" />
        <circle cx="32" cy="12" r="1.6" className="fill-accent" stroke="none" />
        <circle cx="55" cy="50" r="6.5" />
        <line x1="59.6" y1="54.6" x2="63" y2="58" />
      </PersonBase>
    </IconSvg>
  );
}

/** FP：電卓とグラフボードを持つ人物 */
export function FpAdvisorIcon({ className }: AdvisorIconProps) {
  return (
    <IconSvg className={className}>
      <PersonBase>
        <rect x="2" y="44" width="13" height="15" rx="1.8" />
        <line x1="4.5" y1="48" x2="12.5" y2="48" />
        <circle cx="5.5" cy="52.5" r="0.9" className="fill-current" stroke="none" />
        <circle cx="11.5" cy="52.5" r="0.9" className="fill-current" stroke="none" />
        <circle cx="5.5" cy="56.5" r="0.9" className="fill-current" stroke="none" />
        <circle cx="11.5" cy="56.5" r="0.9" className="fill-current" stroke="none" />
        <rect x="48" y="42" width="15" height="17" rx="1.8" />
        <polyline points="50,55 54,49 58,52 61,45" />
        <circle cx="61" cy="45" r="1.8" className="fill-accent" stroke="none" />
      </PersonBase>
    </IconSvg>
  );
}

// ---------------------------------------------------------------------------
// タブ用の簡略アイコン（h-6程度の小サイズ表示向け）
// 全身キャラクターだと小サイズでは視認性が低いため、持ち物のシルエットのみを大きく見せる
// ---------------------------------------------------------------------------

function GlyphSvg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** 不動産屋タブ用：メジャーのシルエット */
export function RealtorGlyphIcon({ className }: AdvisorIconProps) {
  return (
    <GlyphSvg className={className}>
      <circle cx="11" cy="12" r="8" />
      <rect x="17" y="5" width="4.5" height="3.5" rx="0.8" />
      <circle cx="11" cy="12" r="2.2" className="fill-accent" stroke="none" />
    </GlyphSvg>
  );
}

/** 宅建士タブ用：判子のシルエット */
export function LegalAdvisorGlyphIcon({ className }: AdvisorIconProps) {
  return (
    <GlyphSvg className={className}>
      <rect x="9" y="2" width="6" height="10" rx="2" />
      <ellipse cx="12" cy="18" rx="9" ry="4" />
      <ellipse cx="12" cy="18" rx="5" ry="2.2" className="fill-accent" stroke="none" />
    </GlyphSvg>
  );
}

/** 住宅診断士タブ用：虫眼鏡のシルエット */
export function InspectorGlyphIcon({ className }: AdvisorIconProps) {
  return (
    <GlyphSvg className={className}>
      <circle cx="10" cy="10" r="7.5" />
      <line x1="15.3" y1="15.3" x2="21.5" y2="21.5" strokeWidth={2.6} />
      <circle cx="7.5" cy="7.5" r="1.4" className="fill-accent" stroke="none" />
    </GlyphSvg>
  );
}

/** FPタブ用：電卓のシルエット */
export function FpAdvisorGlyphIcon({ className }: AdvisorIconProps) {
  return (
    <GlyphSvg className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2.2" />
      <line x1="7" y1="6.5" x2="17" y2="6.5" strokeWidth={2.4} />
      <circle cx="7.5" cy="12" r="1.1" className="fill-current" stroke="none" />
      <circle cx="12" cy="12" r="1.1" className="fill-current" stroke="none" />
      <circle cx="7.5" cy="16.5" r="1.1" className="fill-current" stroke="none" />
      <circle cx="12" cy="16.5" r="1.1" className="fill-current" stroke="none" />
      <circle cx="16.5" cy="14.2" r="1.4" className="fill-accent" stroke="none" />
    </GlyphSvg>
  );
}
