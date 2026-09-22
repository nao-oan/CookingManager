"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createIngredient, type IngredientState } from "@/actions/ingredients";
import { FieldError } from "@/components/app/field-error";
import { FormError } from "@/components/app/form-error";
import { SelectField } from "@/components/app/select-field";
import { ToggleField } from "@/components/app/toggle-field";
import { UNITS } from "@/domain/unit/units";

/**
 * 食材の追加（F2-1, F2-3）。
 *
 * 画面設計書では専用画面を設けず入力中に作らせる方針のため、C-2 に置く。
 * 入力しながら /api/ingredients/search を呼び、同名・類似の候補を出して
 * 重複作成を防ぐ（F2-3）。
 */

type Candidate = { id: string; name: string; defaultUnit: string; isStaple: boolean };

/** 逐次呼び出しの間隔。打鍵ごとに投げない */
const DEBOUNCE_MS = 250;

export function IngredientCreateForm() {
  const [state, action, pending] = useActionState(createIngredient, null);

  // 登録が通るたびに key が変わり、入力欄と候補が初期状態に戻る
  return (
    <CreateFields
      key={state?.ok ? state.data.id : "new"}
      state={state}
      action={action}
      pending={pending}
    />
  );
}

function CreateFields({
  state,
  action,
  pending,
}: {
  state: IngredientState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const fields = state && !state.ok ? state.error.fields : undefined;
  const formError = state && !state.ok && !state.error.fields ? state.error.message : undefined;

  const query = name.trim();

  useEffect(() => {
    if (query === "") return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/ingredients/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body: { ok: boolean; data?: Candidate[] } = await response.json();
        if (body.ok && body.data) setCandidates(body.data);
      } catch {
        // 中断や通信断は候補が出ないだけ。入力は続けられる
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // 入力を消したときは前回の候補を見せない
  const visible = query === "" ? [] : candidates;
  const exact = visible.find((candidate) => candidate.name === query);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm">
      <p className="font-heading font-bold">食材を追加</p>

      <FormError message={formError} />
      {state?.ok && (
        <p className="rounded-sm bg-green-tint px-3 py-2 text-sm text-green-dark">
          「{state.data.name}」を登録しました
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-bold">
          食材名
        </label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="ほうれん草"
          autoComplete="off"
          aria-invalid={fields?.name ? true : undefined}
          className="min-h-[48px] rounded-sm border border-line bg-white px-3.5 text-[15px] placeholder:text-ink-weak"
        />
        <FieldError message={fields?.name} />
      </div>

      {visible.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-sm bg-mint p-3">
          <p className="text-xs text-ink-mid">
            {exact
              ? "同じ名前の食材が既にあります。新しく作らず、こちらを使ってください"
              : "似た名前の食材があります"}
          </p>
          <ul className="flex flex-col gap-1">
            {visible.map((candidate) => (
              <li key={candidate.id}>
                <Link
                  href={`/settings/ingredients/${candidate.id}/edit`}
                  className="flex items-center gap-2 text-sm text-green-dark underline"
                >
                  {candidate.name}
                  <span className="text-xs text-ink-mid">標準単位 {candidate.defaultUnit}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SelectField
        label="標準単位"
        name="defaultUnit"
        options={UNITS}
        defaultValue="g"
        error={fields?.defaultUnit}
      />

      <ToggleField
        label="常備食材"
        name="isStaple"
        hint="在庫がなくても、いつもあるものとして扱います"
      />

      <button
        type="submit"
        disabled={pending || exact !== undefined}
        className="min-h-[52px] rounded-lg bg-green font-heading font-bold text-cream disabled:opacity-60"
      >
        {pending ? "登録しています…" : "この食材を登録"}
      </button>
    </form>
  );
}
