"use client";

import { useState, type ReactNode } from "react";

/**
 * 削除確認のボトムシート（NFR-10）。画面設計書の .sheet に対応する。
 *
 * 実行の手段は呼び出し側から children で受け取る。ここは「開く・閉じる」と
 * 文言の表示だけを担い、Server Action を直接は呼ばない。
 */
export function DeleteSheet({
  triggerLabel,
  title,
  description,
  children,
}: {
  triggerLabel: string;
  title: string;
  description: string;
  /** 削除を実行するボタン（フォーム）を渡す */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[52px] rounded-lg border-2 border-danger font-heading font-bold text-danger"
      >
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-ink/40">
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-[390px] rounded-t-lg bg-white p-5 pb-8"
          >
            <p className="text-center font-heading text-lg font-bold">{title}</p>
            <p className="mt-1 text-center text-sm text-ink-mid">{description}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[52px] flex-1 rounded-lg bg-mint font-heading font-bold text-green-dark"
              >
                キャンセル
              </button>
              <div className="flex-1">{children}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
