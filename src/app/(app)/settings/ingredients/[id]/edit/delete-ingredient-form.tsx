"use client";

import { useActionState, useState } from "react";
import { deleteIngredient } from "@/actions/ingredients";
import { FormError } from "@/components/app/form-error";
import type { IngredientUsage } from "@/types";

/**
 * 食材の削除（F2-1）。実行前に確認する（NFR-10）。
 *
 * レシピや在庫から参照されている食材は削除できないため、押させる前に
 * 参照件数を見せて理由を示す（docs/design/database.md 4章）。
 */
export function DeleteIngredientForm({ id, usage }: { id: string; usage: IngredientUsage }) {
  const [state, action, pending] = useActionState(deleteIngredient, null);
  const [confirming, setConfirming] = useState(false);

  const referenced: string[] = [];
  if (usage.recipes > 0) referenced.push(`レシピ${usage.recipes}件`);
  if (usage.inventoryItems > 0) referenced.push(`在庫${usage.inventoryItems}件`);
  const inUse = referenced.length > 0;

  if (inUse) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg bg-danger-bg p-4">
        <p className="font-heading font-bold text-danger">この食材は削除できません</p>
        <p className="text-sm text-ink-mid">
          {referenced.join("・")}から使われています。先に参照を外してください。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FormError message={state && !state.ok ? state.error.message : undefined} />

      {confirming ? (
        <div className="flex flex-col gap-3 rounded-lg bg-white p-4 text-center shadow-sm">
          <p className="font-heading font-bold">この食材を削除しますか？</p>
          <p className="text-sm text-ink-mid">削除すると元に戻せません。</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-[48px] flex-1 rounded-lg bg-mint font-heading font-bold text-green-dark"
            >
              キャンセル
            </button>
            <form action={action} className="flex-1">
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                disabled={pending}
                className="min-h-[48px] w-full rounded-lg bg-danger font-heading font-bold text-white disabled:opacity-60"
              >
                {pending ? "削除しています…" : "削除する"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-[52px] rounded-lg border-2 border-danger font-heading font-bold text-danger"
          >
            この食材を削除
          </button>
          <p className="text-center text-xs text-ink-mid">削除前に確認します</p>
        </>
      )}
    </div>
  );
}
