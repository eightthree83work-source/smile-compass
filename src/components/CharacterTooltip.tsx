"use client";

import { ReactNode, useState } from "react";

interface CharacterTooltipProps {
  /** 吹き出しの起点にするキャラクターアイコン（AdvisorCharacterImagesの各FaceIconを想定） */
  icon: ReactNode;
  /** キャラクターのセリフ */
  text: string;
  /** アイコンのaria-label */
  label: string;
}

/**
 * キャラクターアイコンをタップ・ホバーすると、セリフ風の吹き出しが表示されるツールチップ。
 * InfoTooltip（「？」アイコンの補足説明）と同じ開閉インタラクションを踏襲しつつ、
 * 角丸の吹き出し＋アイコンから伸びるしっぽ（三角形）でキャラクターが喋っているような見た目にしている。
 */
export default function CharacterTooltip({ icon, text, label }: CharacterTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="flex shrink-0 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 active:opacity-80"
      >
        {icon}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-0 z-20 mb-3 w-64 max-w-[calc(100vw-3rem)] rounded-2xl border border-ink/15 bg-white p-3 text-xs leading-relaxed text-ink/75 shadow-lg before:absolute before:left-4 before:top-full before:h-3 before:w-3 before:-translate-y-1/2 before:rotate-45 before:border-b before:border-r before:border-ink/15 before:bg-white"
        >
          {text}
        </span>
      )}
    </span>
  );
}
