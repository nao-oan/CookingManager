"use client";

import { useActionState } from "react";
import { updateIngredient } from "@/actions/ingredients";
import { FormError } from "@/components/app/form-error";
import { SelectField } from "@/components/app/select-field";
import { TextField } from "@/components/app/text-field";
import { ToggleField } from "@/components/app/toggle-field";
import { UNITS } from "@/domain/unit/units";
import type { Ingredient } from "@/types";

/** 食材の編集（F2-1, F6-4）。保存すると C-2 へ戻る */
export function IngredientEditForm({
  ingredient,
  registeredOn,
}: {
  ingredient: Ingredient;
  registeredOn: string;
}) {
  const [state, action, pending] = useActionState(updateIngredient, null);
  const fields = state && !state.ok ? state.error.fields : undefined;
  const formError = state && !state.ok && !state.error.fields ? state.error.message : undefined;

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm">
      <input type="hidden" name="id" value={ingredient.id} />

      <FormError message={formError} />

      <TextField
        label="食材名"
        name="name"
        defaultValue={ingredient.name}
        autoComplete="off"
        error={fields?.name}
      />

      <SelectField
        label="標準単位"
        name="defaultUnit"
        options={UNITS}
        defaultValue={ingredient.defaultUnit}
        error={fields?.defaultUnit}
      />

      <ToggleField
        label="常備食材"
        name="isStaple"
        hint="在庫がなくても、いつもあるものとして扱います"
        defaultChecked={ingredient.isStaple}
      />

      <p className="rounded-sm bg-warn-bg px-3 py-2 text-xs text-warn">
        常備食材はレシピ提案の不足判定から除外されます
      </p>

      <p className="flex gap-7 border-t border-line pt-3 text-xs">
        <span className="text-ink-mid">登録日</span>
        <span>{registeredOn}</span>
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-[52px] rounded-lg bg-green font-heading font-bold text-cream disabled:opacity-60"
      >
        {pending ? "保存しています…" : "変更を保存"}
      </button>
    </form>
  );
}
