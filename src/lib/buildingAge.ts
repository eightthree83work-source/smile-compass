export type BuildingAgeInputMode = "age" | "seireki" | "wareki";
export type Era = "showa" | "heisei" | "reiwa";

export const ERA_LABELS: Record<Era, string> = {
  showa: "昭和",
  heisei: "平成",
  reiwa: "令和",
};

export const ERA_OPTIONS: { value: Era; label: string }[] = (Object.keys(ERA_LABELS) as Era[]).map((value) => ({
  value,
  label: ERA_LABELS[value],
}));

/** 元号1年に対応する西暦年の前年（西暦年 = ERA_BASE_YEAR + 和暦年） */
const ERA_BASE_YEAR: Record<Era, number> = {
  showa: 1925,
  heisei: 1988,
  reiwa: 2018,
};

export function eraYearToSeireki(era: Era, eraYear: number): number {
  return ERA_BASE_YEAR[era] + eraYear;
}

export function seirekiToEraYear(seirekiYear: number): { era: Era; eraYear: number } {
  if (seirekiYear >= ERA_BASE_YEAR.reiwa + 1) {
    return { era: "reiwa", eraYear: seirekiYear - ERA_BASE_YEAR.reiwa };
  }
  if (seirekiYear >= ERA_BASE_YEAR.heisei + 1) {
    return { era: "heisei", eraYear: seirekiYear - ERA_BASE_YEAR.heisei };
  }
  return { era: "showa", eraYear: seirekiYear - ERA_BASE_YEAR.showa };
}

export function seirekiToBuildingAge(seirekiYear: number, currentYear = new Date().getFullYear()): number {
  return currentYear - seirekiYear;
}

export function buildingAgeToSeireki(buildingAgeYears: number, currentYear = new Date().getFullYear()): number {
  return currentYear - buildingAgeYears;
}
