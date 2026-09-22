"use client";

import { useState, useTransition } from "react";
import { addInventory, updateInventory, type InventoryState } from "@/actions/inventory";
import { FieldError } from "@/components/app/field-error";
import { FormError } from "@/components/app/form-error";
import { UNITS } from "@/domain/unit/units";
import type { InventoryListItem, Unit } from "@/types";
import { PantryIngredientPicker, type PickedIngredient } from "./pantry-ingredient-picker";

/**
 * P-2 在庫追加 / P-3 在庫編集の共通フォーム（F5-1）。
 *
 * 追加を3タップで終えられるよう既定値を置く（NFR-9）。食材を選べば
 * その標準単位が入り、数量は1、期限は「設定しない」から始まる。
 * 残りの操作は「在庫に追加」を押すだけになる。
 * 検証の正はサーバー側（docs/design/system.md 8.2 方針2）。
 */

/** 数量の既定値。1個・1袋の買い足しが最も多い */
const DEFAULT_QUANTITY = "1";

export function InventoryForm({ item }: { item?: InventoryListItem }) {
  const [picked, setPicked] = useState<PickedIngredient | null>(
    item ? { id: item.ingredientId, name: item.ingredientName, defaultUnit: item.unit } : null,
  );
  // 入力途中を保つため文字列で持つ。数値化は Zod が行う
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : DEFAULT_QUANTITY);
  const [unit, setUnit] = useState<Unit>(item?.unit ?? "g");
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt ?? "");
  const [state, setState] = useState<InventoryState>(null);
  const [pending, startSaving] = useTransition();

  const fields = state && !state.ok ? state.error.fields : undefined;
  const formError = state && !state.ok && !state.error.fields ? state.error.message : undefined;

  const canSave = picked !== null && quantity.trim() !== "";

  function pick(ingredient: PickedIngredient) {
    setPicked(ingredient);
    // 選んだ食材の標準単位を初期選択にする（NFR-9）
    setUnit(ingredient.defaultUnit);
  }

  function save() {
    if (!picked) return;

    const input = { ingredientId: picked.id, quantity, unit, expiresAt };

    startSaving(async () => {
      const result = item
        ? await updateInventory(null, { ...input, id: item.id })
        : await addInventory(null, input);

      // 成功時は Server Action 側で P-1 へ遷移するため、ここには失敗だけが返る
      setState(result ?? null);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-2.5"
    >
      <FormError message={formError} />

      <section className="flex flex-col gap-2 rounded-md bg-white p-3.5 shadow-sm">
        <h2 className="font-heading text-lg font-bold">食材</h2>
        <p className="text-[13px] text-ink-mid">
          {item ? "食材を選び直すことができます。" : "追加する食材を検索して選びましょう。"}
        </p>

        {picked ? (
          <div className="flex items-center justify-between gap-2 rounded-sm bg-mint px-3 py-2.5">
            <span className="font-bold">{picked.name}</span>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="text-sm text-green-dark underline"
            >
              変更
            </button>
          </div>
        ) : (
          <PantryIngredientPicker unit={unit} onPick={pick} />
        )}

        <FieldError message={fields?.ingredientId} />
      </section>

      <section className="flex flex-col gap-2 rounded-md bg-white p-3.5 shadow-sm">
        <h2 className="font-heading text-lg font-bold">数量</h2>
        <p className="text-[13px] text-ink-mid">
          {item ? "現在の数量を入力してください。" : "追加する数量を入力しましょう。"}
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-label="数量"
            className="min-h-[48px] rounded-sm border border-line bg-white px-3.5 text-[15px]"
          />
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value as Unit)}
            aria-label="単位"
            className="min-h-[48px] rounded-sm border border-line bg-white px-3 text-[15px]"
          >
            {UNITS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <FieldError message={fields?.quantity} />
        <FieldError message={fields?.unit} />
      </section>

      <section className="flex flex-col gap-2 rounded-md bg-white p-3.5 shadow-sm">
        <h2 className="font-heading text-lg font-bold">賞味期限（任意）</h2>
        <p className="text-[13px] text-ink-mid">
          賞味期限を設定すると、期限の近いものから使い切れます。
        </p>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            aria-label="賞味期限"
            className="min-h-[48px] rounded-sm border border-line bg-white px-3.5 text-[15px]"
          />
          <button
            type="button"
            onClick={() => setExpiresAt("")}
            disabled={expiresAt === ""}
            className="min-h-[48px] rounded-sm border border-line px-3 text-sm text-ink-mid disabled:opacity-40"
          >
            設定しない
          </button>
        </div>

        <FieldError message={fields?.expiresAt} />
      </section>

      <button
        type="submit"
        disabled={!canSave || pending}
        className="min-h-[52px] rounded-lg bg-green font-heading font-bold text-cream disabled:opacity-60"
      >
        {pending ? "保存しています…" : item ? "変更を保存" : "在庫に追加"}
      </button>
    </form>
  );
}
