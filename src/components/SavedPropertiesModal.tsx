"use client";

import { useState } from "react";
import { SavedComparisonProperty } from "@/lib/propertyComparison";
import { VALUATION_JUDGMENT_LABELS } from "@/lib/valuation";
import PropertyComparisonTable from "@/components/PropertyComparisonTable";

interface SavedPropertiesModalProps {
  properties: SavedComparisonProperty[];
  onOpenProperty: (id: string) => void;
  onDeleteProperty: (id: string) => void;
  onClose: () => void;
}

/** 一度に比較しやすい件数の目安として、選択可能な最大件数を制限する */
const MAX_COMPARE_SELECTION = 4;

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
}

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

const JUDGMENT_BADGE_STYLES: Record<string, string> = {
  undervalued: "bg-[#0b6b0b]/10 text-[#0b6b0b]",
  reasonable: "bg-ink/10 text-ink/70",
  overvalued: "bg-accent/10 text-accent",
};

export default function SavedPropertiesModal({
  properties,
  onOpenProperty,
  onDeleteProperty,
  onClose,
}: SavedPropertiesModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE_SELECTION) {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = (id: string, nickname: string) => {
    if (!window.confirm(`「${nickname}」を削除します。よろしいですか？`)) return;
    onDeleteProperty(id);
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectedProperties = properties.filter((p) => selectedIds.has(p.id));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4 py-8" role="dialog" aria-modal="true">
      <div className="flex max-h-full w-full max-w-2xl flex-col rounded-lg bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 className="font-heading text-lg text-ink">保存した物件</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 touch-manipulation rounded-md border border-ink/20 px-3 py-1.5 text-sm font-medium text-ink/70 active:bg-ink/5"
          >
            閉じる
          </button>
        </div>

        <div className="overflow-auto px-6 py-4">
          {properties.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/50">
              保存した物件はまだありません。診断サマリーの「この物件を保存する」から追加できます。
            </p>
          ) : (
            <div className="space-y-3">
              {properties.map((saved) => (
                <div key={saved.id} className="flex gap-3 rounded-lg border border-ink/15 bg-white p-4">
                  <label className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-ink/25 text-accent focus:ring-accent disabled:opacity-40"
                      checked={selectedIds.has(saved.id)}
                      disabled={!selectedIds.has(saved.id) && selectedIds.size >= MAX_COMPARE_SELECTION}
                      onChange={() => toggleSelect(saved.id)}
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="font-heading text-base text-ink">{saved.nickname}</p>
                      <p className="text-xs text-ink/45">{formatSavedAt(saved.savedAt)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 font-medium ${
                          saved.snapshot.judgment ? JUDGMENT_BADGE_STYLES[saved.snapshot.judgment] : "bg-ink/10 text-ink/50"
                        }`}
                      >
                        {saved.snapshot.judgment ? VALUATION_JUDGMENT_LABELS[saved.snapshot.judgment] : "判定なし"}
                      </span>
                      <span className="text-ink/70">月々 {formatYen(saved.snapshot.monthlyPayment)}</span>
                      <span className="text-ink/70">生涯 {formatYen(saved.snapshot.netLifetimeCost)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenProperty(saved.id)}
                        className="min-h-9 touch-manipulation rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white active:opacity-80"
                      >
                        開く
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(saved.id, saved.nickname)}
                        className="min-h-9 touch-manipulation rounded-md border border-ink/20 px-3 py-1.5 text-sm font-medium text-ink/60 active:bg-ink/5"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {properties.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-ink/10 px-6 py-4">
            <p className="text-xs text-ink/50">
              {selectedIds.size > 0
                ? `${selectedIds.size}件選択中（最大${MAX_COMPARE_SELECTION}件）`
                : "2件以上選択すると比較できます"}
            </p>
            <button
              type="button"
              disabled={selectedIds.size < 2}
              onClick={() => setShowComparison(true)}
              className="min-h-11 touch-manipulation rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              比較する
            </button>
          </div>
        )}
      </div>

      {showComparison && (
        <PropertyComparisonTable properties={selectedProperties} onClose={() => setShowComparison(false)} />
      )}
    </div>
  );
}
