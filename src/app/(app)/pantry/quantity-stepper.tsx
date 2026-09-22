"use client";

import { useActionState } from "react";
import { changeInventoryQuantity } from "@/actions/inventory";
import { FieldError } from "@/components/app/field-error";
import type { Unit } from "@/types";

/**
 * P-1 の `− 数量 +`（F5-3）。画面設計書の .stepper に対応する。
 *
 * 絶対値ではなく差分を送る（docs/design/system.md 8.2 方針4）。
 * ボタンの submit で送るため、JS が動かない環境でも増減できる。
 * 表示する数量はサーバーが返した一覧の値を使う。加算結果を画面側で
 * 先読みすると、連打したときに DB の値とずれるため。
 */

/** 1回の増減量。単位ごとの刻みは持たせず、細かい調整は P-3 で行う */
const STEP = 1;

export function QuantityStepper({
  id,
  name,
  quantity,
  unit,
}: {
  id: string;
  /** 読み上げ用。どの在庫のボタンかを区別する */
  name: string;
  quantity: number;
  unit: Unit;
}) {
  const [state, action, pending] = useActionState(changeInventoryQuantity, null);

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          name="delta"
          value={-STEP}
          disabled={pending || quantity <= 0}
          aria-label={`${name}を1減らす`}
          className="grid size-10 place-items-center rounded-sm bg-green-tint text-xl leading-none text-green-dark disabled:opacity-40"
        >
          −
        </button>
        <span className="grid h-10 min-w-[68px] place-items-center rounded-sm border border-line bg-white text-base">
          {quantity}
        </span>
        <button
          type="submit"
          name="delta"
          value={STEP}
          disabled={pending}
          aria-label={`${name}を1増やす`}
          className="grid size-10 place-items-center rounded-sm bg-green-tint text-xl leading-none text-green-dark disabled:opacity-40"
        >
          ＋
        </button>
        <span className="text-xs text-ink-mid">{unit}</span>
      </div>

      <FieldError message={state && !state.ok ? state.error.message : undefined} />
    </form>
  );
}
