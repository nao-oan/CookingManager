"use client";

import { useState, useTransition } from "react";
import { createRecipe, updateRecipe, type RecipeState } from "@/actions/recipes";
import { FieldError } from "@/components/app/field-error";
import { FormError } from "@/components/app/form-error";
import { UNITS } from "@/domain/unit/units";
import type { Recipe, Unit } from "@/types";
import { NOTE_MAX, STEP_BODY_MAX } from "@/validations/recipe";
import { IngredientPicker, type PickedIngredient } from "./ingredient-picker";

/**
 * R-3 レシピ新規作成 / R-4 レシピ編集の共通フォーム（F3-1, F3-2）。
 *
 * 材料と手順は行数が変わるため、FormData ではなく構造化した値を
 * Server Action へ渡す。検証の正はサーバー側（docs/design/system.md 8.2 方針2）。
 */

type IngredientRow = {
  key: string;
  ingredientId: string;
  name: string;
  /** 入力途中を保つため文字列で持つ。数値化は Zod が行う */
  quantity: string;
  unit: Unit;
};

type StepRow = { key: string; body: string };

function newKey(): string {
  return crypto.randomUUID();
}

function emptyRow(): IngredientRow {
  return { key: newKey(), ingredientId: "", name: "", quantity: "", unit: "g" };
}

export function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const [name, setName] = useState(recipe?.name ?? "");
  const [rows, setRows] = useState<IngredientRow[]>(
    recipe
      ? recipe.ingredients.map((member) => ({
          key: newKey(),
          ingredientId: member.ingredientId,
          name: member.name,
          quantity: String(member.quantity),
          unit: member.unit,
        }))
      : [emptyRow()],
  );
  const [steps, setSteps] = useState<StepRow[]>(
    recipe?.steps.map((body) => ({ key: newKey(), body })) ?? [],
  );
  const [note, setNote] = useState(recipe?.note ?? "");
  const [state, setState] = useState<RecipeState>(null);
  const [pending, startSaving] = useTransition();

  const fields = state && !state.ok ? state.error.fields : undefined;
  const formError = state && !state.ok && !state.error.fields ? state.error.message : undefined;

  const filled = rows.filter((row) => row.ingredientId !== "");
  const canSave = name.trim() !== "" && filled.length > 0;

  function updateRow(key: string, changes: Partial<IngredientRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }

  function pick(key: string, picked: PickedIngredient) {
    updateRow(key, { ingredientId: picked.id, name: picked.name, unit: picked.defaultUnit });
  }

  function moveStep(index: number, to: number) {
    if (to < 0 || to >= steps.length) return;
    setSteps((current) => {
      const next = [...current];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function save() {
    const input = {
      name,
      ingredients: filled.map((row) => ({
        ingredientId: row.ingredientId,
        quantity: row.quantity,
        unit: row.unit,
      })),
      // 空の手順行は送らない
      steps: steps.map((step) => step.body.trim()).filter((body) => body !== ""),
      note: note.trim() === "" ? null : note.trim(),
    };

    startSaving(async () => {
      const result = recipe
        ? await updateRecipe(null, { ...input, id: recipe.id })
        : await createRecipe(null, input);

      // 成功時は Server Action 側で一覧へ遷移するため、ここには失敗だけが返る
      setState(result ?? null);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-3"
    >
      <FormError message={formError} />

      <section className="flex flex-col gap-1.5 rounded-md bg-white p-3.5 shadow-sm">
        <label htmlFor="recipe-name" className="font-heading font-bold">
          料理名
        </label>
        <input
          id="recipe-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="料理名を入力"
          className="min-h-[48px] rounded-sm border border-line bg-white px-3.5 text-[15px] placeholder:text-ink-weak"
        />
        <FieldError message={fields?.name} />
      </section>

      <section className="flex flex-col gap-2.5 rounded-md bg-white p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold">材料</h2>
          <span className="rounded-full bg-danger-bg px-2.5 py-1 text-xs text-danger">
            必須・1件以上
          </span>
        </div>

        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-2 rounded-sm bg-mint p-2.5">
            {row.ingredientId === "" ? (
              <IngredientPicker unit={row.unit} onPick={(picked) => pick(row.key, picked)} />
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{row.name}</span>
                <button
                  type="button"
                  onClick={() => updateRow(row.key, { ingredientId: "", name: "" })}
                  className="text-xs text-green-dark underline"
                >
                  食材を変更
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={row.quantity}
                onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                placeholder="数量"
                aria-label="数量"
                className="min-h-[42px] w-20 rounded-sm border border-line bg-white px-2.5 text-sm"
              />
              <select
                value={row.unit}
                onChange={(event) => updateRow(row.key, { unit: event.target.value as Unit })}
                aria-label="単位"
                className="min-h-[42px] rounded-sm border border-line bg-white px-2 text-sm"
              >
                {UNITS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((it) => it.key !== row.key))}
                className="ml-auto text-sm text-danger"
              >
                削除
              </button>
            </div>
          </div>
        ))}

        <FieldError message={fields?.ingredients} />

        <button
          type="button"
          onClick={() => setRows((current) => [...current, emptyRow()])}
          className="min-h-[46px] rounded-lg border border-dashed border-green font-bold text-green"
        >
          ＋ 材料を追加
        </button>
      </section>

      <section className="flex flex-col gap-2.5 rounded-md bg-white p-3.5 shadow-sm">
        <h2 className="font-heading font-bold">作り方</h2>

        {steps.map((step, index) => (
          <div key={step.key} className="flex items-start gap-2">
            <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-danger-bg text-sm font-bold text-danger">
              {index + 1}
            </span>
            <textarea
              value={step.body}
              maxLength={STEP_BODY_MAX}
              onChange={(event) =>
                setSteps((current) =>
                  current.map((it) =>
                    it.key === step.key ? { ...it, body: event.target.value } : it,
                  ),
                )
              }
              placeholder="手順を入力"
              aria-label={`手順${index + 1}`}
              className="min-h-[72px] flex-1 rounded-sm border border-line bg-white p-2.5 text-sm placeholder:text-ink-weak"
            />
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => moveStep(index, index - 1)}
                disabled={index === 0}
                aria-label={`手順${index + 1}を上へ`}
                className="rounded-sm bg-mint px-1.5 text-sm text-green-dark disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveStep(index, index + 1)}
                disabled={index === steps.length - 1}
                aria-label={`手順${index + 1}を下へ`}
                className="rounded-sm bg-mint px-1.5 text-sm text-green-dark disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => setSteps((current) => current.filter((it) => it.key !== step.key))}
                aria-label={`手順${index + 1}を削除`}
                className="px-1 text-xs text-danger"
              >
                削除
              </button>
            </div>
          </div>
        ))}

        <FieldError message={fields?.steps} />

        <button
          type="button"
          onClick={() => setSteps((current) => [...current, { key: newKey(), body: "" }])}
          className="min-h-[46px] rounded-lg border border-dashed border-green font-bold text-green"
        >
          ＋ 手順を追加
        </button>
      </section>

      <section className="flex flex-col gap-1.5 rounded-md bg-white p-3.5 shadow-sm">
        <label htmlFor="recipe-note" className="font-heading font-bold">
          メモ
        </label>
        <textarea
          id="recipe-note"
          value={note}
          maxLength={NOTE_MAX}
          onChange={(event) => setNote(event.target.value)}
          placeholder="コツや補足を入力"
          className="min-h-[76px] rounded-sm border border-line bg-white p-2.5 text-sm placeholder:text-ink-weak"
        />
        <FieldError message={fields?.note} />
      </section>

      <button
        type="submit"
        disabled={!canSave || pending}
        className="min-h-[52px] rounded-lg bg-green font-heading font-bold text-cream disabled:opacity-60"
      >
        {pending ? "保存しています…" : recipe ? "変更を保存" : "レシピを保存"}
      </button>
    </form>
  );
}
