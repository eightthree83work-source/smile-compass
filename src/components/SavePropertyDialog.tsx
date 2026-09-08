"use client";

import { useState } from "react";
import { INPUT_CLASS_NAME } from "@/components/PropertyForm";

interface SavePropertyDialogProps {
  defaultNickname: string;
  onConfirm: (nickname: string) => void;
  onCancel: () => void;
}

export default function SavePropertyDialog({ defaultNickname, onConfirm, onCancel }: SavePropertyDialogProps) {
  const [nickname, setNickname] = useState(defaultNickname);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
        <h2 className="font-heading text-lg text-ink">この物件を保存する</h2>
        <p className="mt-1 text-sm text-ink/60">あとで一覧から見返したり、他の物件と比較したりできます。</p>
        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="savePropertyNickname" className="block text-sm font-medium text-ink/80">
            物件のニックネーム
          </label>
          <input
            id="savePropertyNickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoFocus
            className={INPUT_CLASS_NAME}
          />
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 touch-manipulation rounded-md border border-ink/20 px-4 py-2.5 text-sm font-medium text-ink/70 active:bg-ink/5"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!nickname.trim()}
              className="min-h-11 touch-manipulation rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
