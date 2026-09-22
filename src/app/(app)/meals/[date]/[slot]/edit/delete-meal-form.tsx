"use client";

import { useActionState } from "react";
import { deleteMeal } from "@/actions/meals";
import { DeleteSheet } from "@/components/app/delete-sheet";
import { FormError } from "@/components/app/form-error";
import type { MealSlot } from "@/types";

/**
 * 記録の削除（F4-1）。ボトムシートで確認してから実行する（NFR-10）。
 * 品目は CASCADE で一緒に消える。
 */
export function DeleteMealForm({ id, date, slot }: { id: string; date: string; slot: MealSlot }) {
  const [state, action, pending] = useActionState(deleteMeal, null);

  return (
    <div className="flex flex-col gap-2">
      <FormError message={state && !state.ok ? state.error.message : undefined} />

      <DeleteSheet
        triggerLabel="この記録を削除"
        title="この記録を削除しますか？"
        description="この操作は取り消せません。"
      >
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="slot" value={slot} />
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
