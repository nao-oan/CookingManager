"use client";

import { useActionState } from "react";
import { deleteInventory } from "@/actions/inventory";
import { DeleteSheet } from "@/components/app/delete-sheet";
import { FormError } from "@/components/app/form-error";

/**
 * 在庫の削除（F5-1）。ボトムシートで確認してから実行する（NFR-10）。
 * 在庫は履歴を持たないため物理削除する（docs/design/database.md 4章）。
 */
export function DeleteInventoryForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteInventory, null);

  return (
    <div className="flex flex-col gap-2">
      <FormError message={state && !state.ok ? state.error.message : undefined} />

      <DeleteSheet
        triggerLabel="この在庫を削除"
        title="在庫を削除しますか？"
        description="この操作は取り消せません。"
      >
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={pending}
            className="min-h-[52px] w-full rounded-lg bg-danger font-heading font-bold text-white disabled:opacity-60"
          >
            {pending ? "削除しています…" : "削除する"}
          </button>
        </form>
      </DeleteSheet>

      <p className="text-center text-xs text-ink-mid">削除前に確認します</p>
    </div>
  );
}
