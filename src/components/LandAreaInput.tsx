"use client";

import { useState } from "react";
import CurrencyInput from "@/components/CurrencyInput";
import { AreaUnit, sqmToTsubo, tsuboToSqm } from "@/lib/units";

const UNIT_OPTIONS: { value: AreaUnit; label: string }[] = [
  { value: "sqm", label: "㎡" },
  { value: "tsubo", label: "坪" },
];

const SEGMENT_BUTTON_CLASS_NAME = "rounded px-2 py-0.5 text-xs font-medium transition-colors";

interface LandAreaInputProps {
  id: string;
  className?: string;
  labelClassName?: string;
  placeholder?: string;
  /** 内部値は常に坪で統一（Property.landAreaTsuboの型に合わせ、未入力はundefined） */
  valueTsubo: number | undefined;
  onChangeTsubo: (valueTsubo: number | undefined) => void;
}

export default function LandAreaInput({
  id,
  className,
  labelClassName,
  placeholder,
  valueTsubo,
  onChangeTsubo,
}: LandAreaInputProps) {
  const [unit, setUnit] = useState<AreaUnit>("tsubo");

  const isEmpty = valueTsubo === undefined;
  const displayValue = isEmpty ? undefined : unit === "tsubo" ? valueTsubo : tsuboToSqm(valueTsubo);

  const handleChange = (next: number | undefined) => {
    if (next === undefined) {
      onChangeTsubo(undefined);
      return;
    }
    onChangeTsubo(unit === "tsubo" ? next : sqmToTsubo(next));
  };

  const referenceText = isEmpty
    ? null
    : unit === "tsubo"
      ? `≈ ${tsuboToSqm(valueTsubo).toFixed(1)}㎡`
      : `≈ ${valueTsubo.toFixed(1)}坪`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={labelClassName}>
          敷地面積
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
      <CurrencyInput id={id} className={className} placeholder={placeholder} value={displayValue} onChange={handleChange} />
      {referenceText && <p className="mt-1 text-xs text-ink/45">{referenceText}</p>}
    </div>
  );
}
