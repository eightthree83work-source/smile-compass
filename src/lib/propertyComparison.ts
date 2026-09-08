import { generateId } from "./id";
import { Property } from "./types";
import { ValuationJudgment } from "./valuation";

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
