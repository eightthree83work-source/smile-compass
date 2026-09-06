"use client";

import { useState } from "react";
import CurrencyInput from "@/components/CurrencyInput";
import {
  BuildingAgeInputMode,
  Era,
  ERA_OPTIONS,
  buildingAgeToSeireki,
  eraYearToSeireki,
  seirekiToBuildingAge,
  seirekiToEraYear,
} from "@/lib/buildingAge";

const MODE_OPTIONS: { value: BuildingAgeInputMode; label: string; fullLabel: string }[] = [
  { value: "age", label: "築年数", fullLabel: "築年数" },
  { value: "seireki", label: "西暦", fullLabel: "建築年（西暦）" },
  { value: "wareki", label: "和暦", fullLabel: "建築年（和暦）" },
];

const SEGMENT_BUTTON_CLASS_NAME = "rounded px-2 py-0.5 text-xs font-medium transition-colors whitespace-nowrap";

interface BuildingAgeInputProps {
  id: string;
  className?: string;
  labelClassName?: string;
  /** 内部値は常に築年数（年）で統一。0は未入力扱い */
  valueYears: number;
  onChangeYears: (years: number) => void;
}

export default function BuildingAgeInput({
  id,
  className = "",
  labelClassName,
  valueYears,
  onChangeYears,
}: BuildingAgeInputProps) {
  const [mode, setMode] = useState<BuildingAgeInputMode>("age");
  const [era, setEra] = useState<Era>("heisei");

  const isEmpty = valueYears === 0;
  const fieldClassName = className.replace(/\bmt-1\b\s*/, "");

  const handleModeChange = (nextMode: BuildingAgeInputMode) => {
    if (nextMode === "wareki" && !isEmpty) {
      setEra(seirekiToEraYear(buildingAgeToSeireki(valueYears)).era);
    }
    setMode(nextMode);
  };

  const handleAgeChange = (next: number | undefined) => {
    onChangeYears(next ?? 0);
  };

  const handleSeirekiChange = (next: number | undefined) => {
    if (next === undefined) {
      onChangeYears(0);
      return;
    }
    onChangeYears(seirekiToBuildingAge(next));
  };

  const handleWarekiYearChange = (next: number | undefined) => {
    if (next === undefined) {
      onChangeYears(0);
      return;
    }
    onChangeYears(seirekiToBuildingAge(eraYearToSeireki(era, next)));
  };

  const handleEraChange = (nextEra: Era) => {
    setEra(nextEra);
    if (!isEmpty) {
      const currentEraYear = seirekiToEraYear(buildingAgeToSeireki(valueYears)).eraYear;
      onChangeYears(seirekiToBuildingAge(eraYearToSeireki(nextEra, currentEraYear)));
    }
  };

  const seirekiValue = isEmpty ? undefined : buildingAgeToSeireki(valueYears);
  const warekiYearValue = isEmpty ? undefined : seirekiToEraYear(buildingAgeToSeireki(valueYears)).eraYear;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className={labelClassName}>
          築年数・建築年
        </label>
        <div className="inline-flex flex-wrap gap-0.5 rounded-md border border-ink/20 p-0.5">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.fullLabel}
              onClick={() => handleModeChange(option.value)}
              className={`${SEGMENT_BUTTON_CLASS_NAME} ${
                mode === option.value ? "bg-accent text-white" : "text-ink/55"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "age" && (
        <CurrencyInput id={id} className={className} value={isEmpty ? undefined : valueYears} onChange={handleAgeChange} />
      )}

      {mode === "seireki" && (
        <CurrencyInput
          id={id}
          className={className}
          placeholder="例：2003"
          value={seirekiValue}
          onChange={handleSeirekiChange}
        />
      )}

      {mode === "wareki" && (
        <div className="mt-1 flex items-center gap-2">
          <select
            className={`${fieldClassName} w-24 shrink-0`}
            value={era}
            onChange={(e) => handleEraChange(e.target.value as Era)}
          >
            {ERA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex-1">
            <CurrencyInput
              id={id}
              className={fieldClassName}
              placeholder="例：15"
              value={warekiYearValue}
              onChange={handleWarekiYearChange}
            />
          </div>
          <span className="shrink-0 text-sm text-ink/55">年</span>
        </div>
      )}

      {!isEmpty && (
        <p className="mt-1 text-xs text-ink/45">
          {mode === "age" ? `≈ 西暦${buildingAgeToSeireki(valueYears)}年` : `≈ 築${valueYears}年`}
        </p>
      )}
    </div>
  );
}
