"use client";

import { useState, useTransition } from "react";
import { saveMeal, type MealState } from "@/actions/meals";
import { FieldError } from "@/components/app/field-error";
import { FormError } from "@/components/app/form-error";
import { MEAL_SLOT_LABELS } from "@/components/app/meal-slot";
import type { Meal, MealSlot } from "@/types";
import { MEAL_ITEM_NAME_MAX, MEAL_NOTE_MAX } from "@/validations/meal";
import { RecipePicker, type PickedRecipe } from "./recipe-picker";

/**
 * M-3 の入力フォーム（F4-1〜F4-3）。
 *
 * 品目は件数が変わるため、FormData ではなく構造化した値を Server Action へ渡す。
 * 検証の正はサーバー側（docs/design/system.md 8.2 方針2）。
 */

type ItemRow = {
  key: string;
  /** レシピ参照なら UUID、自由入力なら null */
  recipeId: string | null;
  displayName: string;
};

/** 品目の追加方法。モックアップ m-3 のセグメントに対応する */
type Mode = "recipe" | "free";

function newKey(): string {
  return crypto.randomUUID();
}

export function MealForm({
  date,
  slot,
  meal,
  preset,
  fromRecipeId,
}: {
  date: string;
  slot: MealSlot;
  meal: Meal | null;
  /** R-2 から引き継いだレシピ。既定で品目に入れる（NFR-9） */
  preset: PickedRecipe | null;
  fromRecipeId: string | null;
}) {
  const [rows, setRows] = useState<ItemRow[]>(() => initialRows(meal, preset));
  const [mode, setMode] = useState<Mode>("recipe");
  const [free, setFree] = useState("");
  const [note, setNote] = useState(meal?.note ?? "");
  const [state, setState] = useState<MealState>(null);
  const [pending, startSaving] = useTransition();

  const fields = state && !state.ok ? state.error.fields : undefined;
  const formError = state && !state.ok && !state.error.fields ? state.error.message : undefined;

  const filled = rows.filter((row) => row.displayName.trim() !== "");
  const canSave = filled.length > 0;

  function add(row: Omit<ItemRow, "key">) {
    setRows((current) => [...current, { ...row, key: newKey() }]);
  }

  function save() {
    startSaving(async () => {
      const result = await saveMeal(null, {
        date,
        slot,
        items: filled.map((row) => ({
          recipeId: row.recipeId,
          displayName: row.displayName.trim(),
        })),
        note,
        fromRecipeId,
      });

      // 成功時は Server Action 側で画面を移すため、ここには失敗だけが返る
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

      <div className="flex rounded-full bg-mint p-1">
        <ModeButton current={mode} value="recipe" label="登録済みレシピ" onSelect={setMode} />
        <ModeButton current={mode} value="free" label="自由入力" onSelect={setMode} />
      </div>

      {mode === "recipe" ? (
        <RecipePicker onPick={(recipe) => add({ recipeId: recipe.id, displayName: recipe.name })} />
      ) : (
        <div className="flex gap-2">
          <input
            value={free}
            maxLength={MEAL_ITEM_NAME_MAX}
            onChange={(event) => setFree(event.target.value)}
            placeholder="食べたものを入力"
            aria-label="食べたものを入力"
            className="min-h-[44px] flex-1 rounded-sm border border-line bg-white px-3 text-sm placeholder:text-ink-weak"
          />
          <button
            type="button"
            disabled={free.trim() === ""}
            onClick={() => {
              add({ recipeId: null, displayName: free.trim() });
              setFree("");
            }}
            className="min-h-[44px] rounded-sm bg-mint px-4 font-bold text-green-dark disabled:opacity-60"
          >
            追加
          </button>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-bold">品目</h2>

        {rows.length === 0 ? (
          <p className="rounded-md bg-mint px-4 py-6 text-center text-sm text-ink-mid">
            上の検索か自由入力から品目を追加してください
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center gap-2 rounded-md bg-white p-2 shadow-sm"
            >
              <span
                aria-hidden
                className="grid h-12 w-16 place-items-center rounded-sm bg-mint text-2xl"
              >
                🍽️
              </span>

              <div className="flex-1">
                {row.recipeId === null ? (
                  <>
                    <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[10px] text-warn">
                      自由入力
                    </span>
                    <input
                      value={row.displayName}
                      maxLength={MEAL_ITEM_NAME_MAX}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((it) =>
                            it.key === row.key ? { ...it, displayName: event.target.value } : it,
                          ),
                        )
                      }
                      aria-label="料理名"
                      className="mt-1 min-h-[42px] w-full rounded-sm border border-line bg-white px-2.5 text-sm"
                    />
                  </>
                ) : (
                  <>
                    <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] text-green-dark">
                      レシピ
                    </span>
                    <p className="mt-1 text-sm font-bold">{row.displayName}</p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setRows((current) => current.filter((it) => it.key !== row.key))}
                aria-label="この品目を削除"
                className="grid size-7 place-items-center rounded-full bg-line text-ink-mid"
              >
                ×
              </button>
            </div>
          ))
        )}

        <FieldError message={fields?.items} />
      </section>

      <section className="flex flex-col gap-1.5 rounded-md bg-white p-3.5 shadow-sm">
        <label htmlFor="meal-note" className="font-heading font-bold">
          メモ（任意）
        </label>
        <textarea
          id="meal-note"
          value={note}
          maxLength={MEAL_NOTE_MAX}
          onChange={(event) => setNote(event.target.value)}
          placeholder="味の感想や次への覚え書き"
          className="min-h-[80px] rounded-sm border border-line bg-white p-2.5 text-sm placeholder:text-ink-weak"
        />
        <p className="text-right text-[11px] text-ink-mid">
          {note.length}/{MEAL_NOTE_MAX}
        </p>
        <FieldError message={fields?.note} />
      </section>

      <button
        type="submit"
        disabled={!canSave || pending}
        className="min-h-[52px] rounded-lg bg-green font-heading font-bold text-cream disabled:opacity-60"
      >
        {pending ? "保存しています…" : `${MEAL_SLOT_LABELS[slot]}の記録を保存`}
      </button>
    </form>
  );
}

/**
 * 既存の記録に、R-2 から引き継いだレシピを足した初期値。
 * 同じレシピが既に入っている場合は重ねない。
 */
function initialRows(meal: Meal | null, preset: PickedRecipe | null): ItemRow[] {
  const rows: ItemRow[] =
    meal?.items.map((item) => ({
      key: newKey(),
      recipeId: item.recipeId,
      displayName: item.displayName,
    })) ?? [];

  if (preset && !rows.some((row) => row.recipeId === preset.id)) {
    rows.push({ key: newKey(), recipeId: preset.id, displayName: preset.name });
  }

  return rows;
}

function ModeButton({
  current,
  value,
  label,
  onSelect,
}: {
  current: Mode;
  value: Mode;
  label: string;
  onSelect: (mode: Mode) => void;
}) {
  const active = current === value;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(value)}
      className={`min-h-[40px] flex-1 rounded-full text-sm font-bold ${
        active ? "bg-white text-green-dark shadow-sm" : "text-ink-mid"
      }`}
    >
      {label}
    </button>
  );
}
