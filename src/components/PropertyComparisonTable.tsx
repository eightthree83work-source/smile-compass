"use client";

import { SavedComparisonProperty } from "@/lib/propertyComparison";
import { VALUATION_JUDGMENT_LABELS } from "@/lib/valuation";

interface PropertyComparisonTableProps {
  properties: SavedComparisonProperty[];
  onClose: () => void;
}

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
}

interface Row {
  label: string;
  values: (string | number)[];
  /** 各値の元になった数値（小さいほど有利ならtrueをそのまま比較に使う）。nullは比較対象外 */
  rawValues: (number | null)[];
  /** 数値が小さいほど有利なら"min"、大きいほど有利なら"max"、比較しないならnull */
  betterDirection: "min" | "max" | null;
}

function buildRows(properties: SavedComparisonProperty[]): Row[] {
  return [
    {
      label: "価格",
      values: properties.map((p) => formatYen(p.property.price)),
      rawValues: properties.map((p) => p.property.price),
      betterDirection: "min",
    },
    {
      label: "延床面積",
      values: properties.map((p) => `${p.property.floorAreaSqm}㎡`),
      rawValues: properties.map((p) => p.property.floorAreaSqm),
      betterDirection: "max",
    },
    {
      label: "築年数",
      values: properties.map((p) => `${p.property.buildingAgeYears}年`),
      rawValues: properties.map((p) => p.property.buildingAgeYears),
      betterDirection: "min",
    },
    {
      label: "坪単価判定",
      values: properties.map((p) => (p.snapshot.judgment ? VALUATION_JUDGMENT_LABELS[p.snapshot.judgment] : "―")),
      rawValues: properties.map((p) => (p.snapshot.judgment === "undervalued" ? -1 : p.snapshot.judgment === "overvalued" ? 1 : 0)),
      betterDirection: "min",
    },
    {
      label: "相場との乖離率",
      values: properties.map((p) => (p.snapshot.diffPercent !== null ? `${p.snapshot.diffPercent > 0 ? "+" : ""}${p.snapshot.diffPercent.toFixed(1)}%` : "―")),
      rawValues: properties.map((p) => p.snapshot.diffPercent),
      betterDirection: "min",
    },
    {
      label: "月々返済額",
      values: properties.map((p) => formatYen(p.snapshot.monthlyPayment)),
      rawValues: properties.map((p) => p.snapshot.monthlyPayment),
      betterDirection: "min",
    },
    {
      label: "生涯コストの目安",
      values: properties.map((p) => formatYen(p.snapshot.netLifetimeCost)),
      rawValues: properties.map((p) => p.snapshot.netLifetimeCost),
      betterDirection: "min",
    },
    {
      label: "要確認項目数",
      values: properties.map((p) => `${p.snapshot.legalChecklistCount + p.snapshot.inspectionChecklistCount}項目`),
      rawValues: properties.map((p) => p.snapshot.legalChecklistCount + p.snapshot.inspectionChecklistCount),
      betterDirection: "min",
    },
  ];
}

function findBestIndexes(row: Row): Set<number> {
  const best = new Set<number>();
  if (!row.betterDirection) return best;

  const validValues = row.rawValues.filter((v): v is number => v !== null);
  if (validValues.length === 0) return best;

  const target = row.betterDirection === "min" ? Math.min(...validValues) : Math.max(...validValues);
  row.rawValues.forEach((v, index) => {
    if (v === target) best.add(index);
  });
  // 全員が同値の場合はハイライトしても意味がないため表示しない
  return best.size === row.rawValues.length ? new Set() : best;
}

export default function PropertyComparisonTable({ properties, onClose }: PropertyComparisonTableProps) {
  const rows = buildRows(properties);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-8" role="dialog" aria-modal="true">
      <div className="flex max-h-full w-full max-w-3xl flex-col rounded-lg bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 className="font-heading text-lg text-ink">物件を比較する</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 touch-manipulation rounded-md border border-ink/20 px-3 py-1.5 text-sm font-medium text-ink/70 active:bg-ink/5"
          >
            閉じる
          </button>
        </div>

        <div className="overflow-auto px-6 py-4">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-ink/15 py-2 pr-3 text-left text-xs text-ink/45">項目</th>
                {properties.map((p) => (
                  <th key={p.id} className="border-b border-ink/15 px-3 py-2 text-left font-heading text-base text-ink">
                    {p.nickname}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const bestIndexes = findBestIndexes(row);
                return (
                  <tr key={row.label}>
                    <th className="whitespace-nowrap border-b border-ink/10 py-3 pr-3 text-left text-xs font-medium text-ink/55">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td
                        key={properties[index].id}
                        className={`whitespace-nowrap border-b border-ink/10 px-3 py-3 ${
                          bestIndexes.has(index) ? "rounded bg-accent/10 font-semibold text-accent" : "text-ink"
                        }`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
