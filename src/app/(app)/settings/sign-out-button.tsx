"use client";

import { useState } from "react";
import { signOut } from "@/actions/auth";

/** ログアウト（F1-3）。実行前に確認する（NFR-10 に準じる） */
export function SignOutButton() {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-[52px] rounded-lg border-2 border-danger font-heading font-bold text-danger"
      >
        ログアウト
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white p-4 text-center shadow-sm">
      <p className="font-heading font-bold">ログアウトしますか？</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-[48px] flex-1 rounded-lg bg-mint font-heading font-bold text-green-dark"
        >
          キャンセル
        </button>
        <form action={signOut} className="flex-1">
          <button
            type="submit"
            className="min-h-[48px] w-full rounded-lg bg-danger font-heading font-bold text-white"
          >
            ログアウト
          </button>
        </form>
      </div>
    </div>
  );
}
