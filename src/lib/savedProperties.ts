import { generateId } from "./id";
import { Property } from "./types";

export interface SavedProperty {
  id: string;
  /** 保存時に付けた名前（例：物件A、荒川区の家） */
  name: string;
  property: Property;
  /** 保存日時（ISO文字列） */
  savedAt: string;
}

const SAVED_PROPERTIES_STORAGE_KEY = "home-compass:saved-properties";

/** 保存済み物件一覧をlocalStorageから読み込む */
export function loadSavedProperties(): SavedProperty[] {
  try {
    const raw = window.localStorage.getItem(SAVED_PROPERTIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedProperty[]) : [];
  } catch {
    return [];
  }
}

/** 保存済み物件一覧をlocalStorageへ書き込む */
export function persistSavedProperties(savedProperties: SavedProperty[]): void {
  window.localStorage.setItem(SAVED_PROPERTIES_STORAGE_KEY, JSON.stringify(savedProperties));
}

export function createSavedProperty(name: string, property: Property): SavedProperty {
  return {
    id: generateId(),
    name,
    property,
    savedAt: new Date().toISOString(),
  };
}
