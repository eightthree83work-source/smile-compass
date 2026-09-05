"use client";

import { SavedProperty } from "@/lib/savedProperties";

interface SavedPropertySelectorProps {
  savedProperties: SavedProperty[];
  /** 現在読み込んで編集中の保存済み物件のID。新規（未保存）の場合はnull */
  currentPropertyId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
}

const NEW_PROPERTY_VALUE = "__new__";

function formatSavedAt(savedAt: string): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOptionLabel(saved: SavedProperty): string {
  const location = saved.property.location.trim() || "所在地未入力";
  const date = formatSavedAt(saved.savedAt);
  return `${saved.name}（${location}）・${date}`;
}

export default function SavedPropertySelector({
  savedProperties,
  currentPropertyId,
  onSelect,
  onDelete,
}: SavedPropertySelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onSelect(value === NEW_PROPERTY_VALUE ? null : value);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="savedPropertySelect" className="block text-sm font-medium text-ink/80">
        保存済みの物件
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          id="savedPropertySelect"
          value={currentPropertyId ?? NEW_PROPERTY_VALUE}
          onChange={handleChange}
          className="min-h-11 flex-1 touch-manipulation rounded-md border border-ink/20 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {savedProperties.map((saved) => (
            <option key={saved.id} value={saved.id}>
              {formatOptionLabel(saved)}
            </option>
          ))}
          <option value={NEW_PROPERTY_VALUE}>＋ 新規作成</option>
        </select>

        {currentPropertyId && (
          <button
            type="button"
            onClick={() => onDelete(currentPropertyId)}
            className="min-h-11 shrink-0 touch-manipulation rounded-md border border-ink/20 px-3 py-2.5 text-sm font-medium text-ink/60 active:bg-ink/5"
          >
            選択した物件を削除
          </button>
        )}
      </div>
    </div>
  );
}
