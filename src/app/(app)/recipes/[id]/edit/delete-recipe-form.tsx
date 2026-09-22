"use client";

import { useActionState } from "react";
import { deleteRecipe } from "@/actions/recipes";
import { DeleteSheet } from "@/components/app/delete-sheet";
import { FormError } from "@/components/app/form-error";

/**
 * レシピの削除（F3-1）。ボトムシートで確認してから実行する（NFR-10）。
 * 材料と手順は CASCADE で消え、食事記録は表示名だけが残る。
 */
export function DeleteRecipeForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteRecipe, null);

  return (
    <div className="flex flex-col gap-2">
      <FormError message={state && !state.ok ? state.error.message : undefined} />

      <DeleteSheet
        triggerLabel="このレシピを削除"
        title="レシピを削除しますか？"
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
    </div>
  );
}
