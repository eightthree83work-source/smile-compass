import { generateId } from "./id";
import { createDefaultProperty, Property } from "./types";
import { calculatePricePerTsuboManYen, ValuationJudgment } from "./valuation";
import { calculateLifetimeCostEstimate, calculateLoanRepayment } from "./calculations";
import { getLegalChecklist } from "./legalChecklist";
import { getInspectionChecklist } from "./inspectionChecklist";

const STORAGE_KEY = "smile-compass-saved-properties";

/**
 * 保存できる物件数の上限。将来的に無料プランの上限機能を追加しやすいよう、
 * この定数だけを変更すれば全体に反映される形にしている。
 */
export const MAX_SAVED_PROPERTIES = 20;

/** 比較テーブル・カード一覧で使う、保存時点の診断結果スナップショット */
export interface ComparisonSnapshot {
  /** 坪単価（万円）。床面積未入力等でnullの場合あり */
  pricePerTsuboManYen: number | null;
  /** 保存時点で入力されていた周辺相場の坪単価（万円） */
  marketPricePerTsuboManYen: number;
  /** 周辺相場との乖離率（%）。判定できない場合はnull */
  diffPercent: number | null;
  /** 割安・適正・割高の判定。判定できない場合はnull */
  judgment: ValuationJudgment | null;
  /** 月々返済額（円） */
  monthlyPayment: number;
  /** 生涯コストの目安（円） */
  netLifetimeCost: number;
  /** 宅建士チェックリストの要確認項目数 */
  legalChecklistCount: number;
  /** 住宅診断士チェックリストの要確認項目数 */
  inspectionChecklistCount: number;
}

export interface SavedComparisonProperty {
  id: string;
  /** 保存時に付けた物件のニックネーム */
  nickname: string;
  /** 保存日時（ISO文字列） */
  savedAt: string;
  /** 保存時点のPropertyForm入力値そのもの（再度開いて編集できるように） */
  property: Property;
  /** 保存時点で計算していた診断結果（比較テーブルの再計算を避けるためのキャッシュ） */
  snapshot: ComparisonSnapshot;
}

export function loadSavedComparisonProperties(): SavedComparisonProperty[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedComparisonProperty[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedComparisonProperties(properties: SavedComparisonProperty[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
  } catch {
    // localStorageが使えない・容量超過などの場合は保存を諦める（アプリ自体は継続動作させる）
  }
}

export function createSavedComparisonProperty(
  nickname: string,
  property: Property,
  snapshot: ComparisonSnapshot,
): SavedComparisonProperty {
  return {
    id: generateId(),
    nickname,
    savedAt: new Date().toISOString(),
    property,
    snapshot,
  };
}

// ---------------------------------------------------------------------------
// 旧「下書き切り替え」機能（home-compass:saved-properties）からの移行
// ---------------------------------------------------------------------------

const LEGACY_STORAGE_KEY = "home-compass:saved-properties";
const LEGACY_MIGRATION_FLAG_KEY = "smile-compass:legacy-saved-properties-migrated";

interface LegacySavedProperty {
  id: string;
  name: string;
  property: Property;
  savedAt: string;
}

/**
 * 旧機能には周辺相場・診断結果の保存がなかったため、移行時点のPropertyから
 * 計算できる範囲でスナップショットを作る（周辺相場は未取得＝0、判定はnull扱い）。
 */
function buildSnapshotForMigratedProperty(property: Property): ComparisonSnapshot {
  const repayment = calculateLoanRepayment(property);
  const lifetimeCost = calculateLifetimeCostEstimate(property);
  return {
    pricePerTsuboManYen: calculatePricePerTsuboManYen(property),
    marketPricePerTsuboManYen: 0,
    diffPercent: null,
    judgment: null,
    monthlyPayment: repayment.monthlyPayment,
    netLifetimeCost: lifetimeCost.netLifetimeCost,
    legalChecklistCount: getLegalChecklist(property).length,
    inspectionChecklistCount: getInspectionChecklist(property).length,
  };
}

/**
 * 旧機能のlocalStorageデータを新しいデータ構造へ1度だけ移行する。
 * 画像メモ（IndexedDB）は旧SavedProperty.idをキーに紐づいているため、
 * 同じidを維持したまま移行することで画像の再紐付けを不要にしている。
 * 移行が済んだら旧キーを削除し、フラグを立てて二重実行を防ぐ。
 * 失敗した場合は何もせず（フラグも立てず）、既存データはどちらのキーにも残したままにする。
 */
export function migrateLegacySavedProperties(): void {
  try {
    if (window.localStorage.getItem(LEGACY_MIGRATION_FLAG_KEY)) return;

    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, "1");
      return;
    }

    const parsed: unknown = JSON.parse(raw);
    const legacyList = Array.isArray(parsed) ? (parsed as LegacySavedProperty[]) : [];

    const current = loadSavedComparisonProperties();
    const currentIds = new Set(current.map((p) => p.id));

    const migrated: SavedComparisonProperty[] = legacyList
      .filter(
        (legacy): legacy is LegacySavedProperty =>
          !!legacy && typeof legacy.id === "string" && !currentIds.has(legacy.id),
      )
      .map((legacy) => {
        const mergedProperty = { ...createDefaultProperty(), ...legacy.property };
        return {
          id: legacy.id,
          nickname: legacy.name?.trim() || "無題の物件",
          savedAt: legacy.savedAt ?? new Date().toISOString(),
          property: mergedProperty,
          snapshot: buildSnapshotForMigratedProperty(mergedProperty),
        };
      });

    const next = [...current, ...migrated];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    window.localStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, "1");
  } catch {
    // 移行に失敗した場合はフラグを立てず、既存データもそのまま残す（次回起動時に再試行される）
  }
}
