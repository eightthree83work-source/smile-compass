"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatJapaneseYen } from "@/lib/japaneseAmount";

interface CurrencyInputProps {
  id: string;
  /** 内部で保持する値はカンマなしの数値のまま（未入力はundefined） */
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  className?: string;
  /** 入力欄の下に「1億2,500万円」のような日本語の位取り表記を補助表示する（円単位の金額欄向け） */
  showJapaneseAmount?: boolean;
}

function isSignificantChar(ch: string): boolean {
  return (ch >= "0" && ch <= "9") || ch === ".";
}

/** 数字と小数点以外の文字（カンマ・通貨記号など）を取り除く */
function cleanNumericInput(raw: string): string {
  let result = "";
  let hasDot = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      result += ch;
    } else if (ch === "." && !hasDot) {
      hasDot = true;
      result += ch;
    }
  }
  return result;
}

/**
 * 先頭の不要な0を取り除く（"0.5"のような小数点前の0は残す）。
 * 取り除いた文字数も返す（カーソル位置の補正に使う）。
 */
function stripLeadingZeros(value: string): { result: string; removedCount: number } {
  const match = value.match(/^0+(?=\d)/);
  if (!match) return { result: value, removedCount: 0 };
  return { result: value.slice(match[0].length), removedCount: match[0].length };
}

/** カンマなしの数値文字列の整数部だけをカンマ区切りにする */
function formatDigitsWithCommas(cleaned: string): string {
  const [integerPart, ...rest] = cleaned.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fractionalPart = rest.length > 0 ? `.${rest.join("")}` : "";
  return `${groupedInteger}${fractionalPart}`;
}

function parseCleaned(cleaned: string): number | undefined {
  if (cleaned === "" || cleaned === ".") return undefined;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatValueForDisplay(value: number | undefined): string {
  if (value === undefined) return "";
  return formatDigitsWithCommas(String(value));
}

/** 円・万円などの金額入力欄。内部の値はカンマなしの数値のまま、表示だけカンマ区切りにする */
export default function CurrencyInput({
  id,
  value,
  onChange,
  placeholder,
  className,
  showJapaneseAmount,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretRef = useRef<number | null>(null);

  const [displayValue, setDisplayValue] = useState(() => formatValueForDisplay(value));
  const [lastEmittedValue, setLastEmittedValue] = useState(value);

  // リセットや保存済み物件の読込など、このコンポーネント外の要因で値が変わった場合のみ表示を同期する
  if (value !== lastEmittedValue) {
    setDisplayValue(formatValueForDisplay(value));
    setLastEmittedValue(value);
  }

  useLayoutEffect(() => {
    if (pendingCaretRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(pendingCaretRef.current, pendingCaretRef.current);
      pendingCaretRef.current = null;
    }
  }, [displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const caretPos = e.target.selectionStart ?? rawValue.length;

    let caretDigitCount = 0;
    for (let i = 0; i < caretPos; i++) {
      if (isSignificantChar(rawValue[i])) caretDigitCount++;
    }

    const cleanedRaw = cleanNumericInput(rawValue);
    const { result: cleaned, removedCount } = stripLeadingZeros(cleanedRaw);
    caretDigitCount = Math.max(0, caretDigitCount - removedCount);

    const formatted = formatDigitsWithCommas(cleaned);
    const parsed = parseCleaned(cleaned);

    let newCaretPos = formatted.length;
    if (caretDigitCount === 0) {
      newCaretPos = 0;
    } else {
      let consumed = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (isSignificantChar(formatted[i])) consumed++;
        if (consumed === caretDigitCount) {
          newCaretPos = i + 1;
          break;
        }
      }
    }
    pendingCaretRef.current = newCaretPos;

    setDisplayValue(formatted);
    setLastEmittedValue(parsed);
    onChange(parsed);
  };

  const japaneseAmount = showJapaneseAmount ? formatJapaneseYen(value) : null;

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        className={className}
        value={displayValue}
        onChange={handleChange}
        onFocus={(e) => e.target.select()}
      />
      {japaneseAmount && <p className="mt-1 text-xs text-ink/45">{japaneseAmount}</p>}
    </>
  );
}
