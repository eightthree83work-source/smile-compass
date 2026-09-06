"use client";

import { useState } from "react";

interface InfoTooltipProps {
  text: string;
}

/** ラベル横に置く「？」アイコン。クリック・ホバーで計算式などの補足説明を表示する */
export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="計算方法の説明を表示"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-ink/30 text-[10px] leading-none text-ink/50 focus:outline-none focus:ring-1 focus:ring-accent active:border-accent active:text-accent"
      >
        ？
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-md border border-ink/15 bg-white p-2.5 text-xs leading-relaxed text-ink/70 shadow-md"
        >
          {text}
        </span>
      )}
    </span>
  );
}
