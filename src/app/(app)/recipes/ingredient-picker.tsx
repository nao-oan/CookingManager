"use client";

import { useEffect, useState, useTransition } from "react";
import { createIngredient } from "@/actions/ingredients";
import { FieldError } from "@/components/app/field-error";
import type { Unit } from "@/types";

/**
 * 材料行の食材選択（F2-2, F2-3）。
 *
 * 入力しながら /api/ingredients/search を呼んで候補を出す。候補が無いときは
 * その場で食材マスタに登録する。同名があれば候補として出るので、
 * 新規登録ボタンは押せない。
 */

export type PickedIngredient = { id: string; name: string; defaultUnit: Unit };

type Candidate = { id: string; name: string; defaultUnit: Unit };

/** 逐次呼び出しの間隔。打鍵ごとに投げない */
const DEBOUNCE_MS = 250;

export function IngredientPicker({
  unit,
  onPick,
}: {
  /** 新規登録する食材の標準単位。行で選んでいる単位を既定にする */
  unit: Unit;
  onPick: (ingredient: PickedIngredient) => void;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [creating, startCreating] = useTransition();

  const keyword = query.trim();

  useEffect(() => {
    if (keyword === "") return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/ingredients/search?q=${encodeURIComponent(keyword)}`, {
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
  }, [keyword]);

  const visible = keyword === "" ? [] : candidates;
  const exact = visible.find((candidate) => candidate.name === keyword);

  function create() {
    startCreating(async () => {
      const formData = new FormData();
      formData.set("name", keyword);
      formData.set("defaultUnit", unit);

      const result = await createIngredient(null, formData);

      if (result?.ok) {
        onPick({
          id: result.data.id,
          name: result.data.name,
          defaultUnit: result.data.defaultUnit,
        });
        return;
      }

      setError(result ? result.error.message : "登録できませんでした");
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setError(undefined);
        }}
        placeholder="食材名で検索"
        aria-label="食材名で検索"
        autoComplete="off"
        className="min-h-[42px] rounded-sm border border-line bg-white px-2.5 text-sm placeholder:text-ink-weak"
      />

      {visible.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {visible.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => onPick(candidate)}
                className="rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-line"
              >
                {candidate.name}
                <span className="ml-1.5 text-ink-mid">{candidate.defaultUnit}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {keyword !== "" && !exact && (
        <button
          type="button"
          onClick={create}
          disabled={creating}
          className="self-start rounded-full bg-green-tint px-2.5 py-1 text-xs font-bold text-green-dark disabled:opacity-60"
        >
          {creating ? "登録しています…" : `「${keyword}」を新規登録（単位 ${unit}）`}
        </button>
      )}

      <FieldError message={error} />
    </div>
  );
}
