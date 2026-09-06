"use client";

import { useState } from "react";
import CurrencyInput from "@/components/CurrencyInput";
import { AreaUnit, sqmToTsubo, tsuboToSqm } from "@/lib/units";

const UNIT_OPTIONS: { value: AreaUnit; label: string }[] = [
  { value: "sqm", label: "㎡" },
  { value: "tsubo", label: "坪" },
];

const SEGMENT_BUTTON_CLASS_NAME = "rounded px-2 py-0.5 text-xs font-medium transition-colors";

interface FloorAreaInputProps {
  id: string;
  className?: string;
  labelClassName?: string;
  /** 内部値は常に㎡で統一。0は未入力扱い */
  valueSqm: number;
  onChangeSqm: (valueSqm: number) => void;
}

export default function FloorAreaInput({ id, className, labelClassName, valueSqm, onChangeSqm }: FloorAreaInputProps) {
  const [unit, setUnit] = useState<AreaUnit>("sqm");

  const isEmpty = valueSqm === 0;
  const displayValue = isEmpty ? undefined : unit === "sqm" ? valueSqm : sqmToTsubo(valueSqm);

  const handleChange = (next: number | undefined) => {
    if (next === undefined) {
      onChangeSqm(0);
      return;
    }
    onChangeSqm(unit === "sqm" ? next : tsuboToSqm(next));
  };

  const referenceText = isEmpty
    ? null
    : unit === "sqm"
      ? `≈ ${sqmToTsubo(valueSqm).toFixed(1)}坪`
      : `≈ ${valueSqm.toFixed(1)}㎡`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={labelClassName}>
          延床面積
        </label>
        <div className="inline-flex rounded-md border border-ink/20 p-0.5">
          {UNIT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setUnit(option.value)}
              className={`${SEGMENT_BUTTON_CLASS_NAME} ${
                unit === option.value ? "bg-accent text-white" : "text-ink/55"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <CurrencyInput id={id} className={className} value={displayValue} onChange={handleChange} />
      {referenceText && <p className="mt-1 text-xs text-ink/45">{referenceText}</p>}
    </div>
  );
}
