"use client";

import { useEffect, useState, useTransition } from "react";
import { createIngredient } from "@/actions/ingredients";
import { FieldError } from "@/components/app/field-error";
import type { Unit } from "@/types";

/**
 * P-2・P-3 の食材選択（F2-2, F2-3）。
 *
 * 入力しながら /api/ingredients/search を呼んで候補を出す。候補が無いときは
 * その場で食材マスタに登録する。同名があれば候補として出るので、
 * 新規登録ボタンは出さない。
 *
 * レシピ側の ingredient-picker と作りは同じだが、共通化のために動かすと
 * レシピの実装と衝突するため、在庫用に別ファイルとして置く。候補を選んだ時点で
 * 標準単位も渡し、在庫の追加を3タップに収める（NFR-9）。
 */

export type PickedIngredient = { id: string; name: string; defaultUnit: Unit };

/** 逐次呼び出しの間隔。打鍵ごとに投げない */
const DEBOUNCE_MS = 250;

export function PantryIngredientPicker({
  unit,
  onPick,
}: {
  /** 新規登録する食材の標準単位。フォームで選んでいる単位を既定にする */
  unit: Unit;
  onPick: (ingredient: PickedIngredient) => void;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<PickedIngredient[]>([]);
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
        const body: { ok: boolean; data?: PickedIngredient[] } = await response.json();
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

  // 入力を消したときは前回の候補を見せない
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
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setError(undefined);
        }}
        placeholder="食材名で検索"
        aria-label="食材名で検索"
        autoComplete="off"
        className="min-h-[48px] rounded-sm border border-line bg-white px-3.5 text-[15px] placeholder:text-ink-weak"
      />

      {visible.length > 0 && (
        <ul className="overflow-hidden rounded-sm border border-line">
          {visible.map((candidate) => (
            <li key={candidate.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => onPick(candidate)}
                className="flex min-h-[46px] w-full items-center gap-2 px-2.5 text-left font-bold"
              >
                {candidate.name}
                <span className="text-xs font-normal text-ink-mid">
                  標準単位 {candidate.defaultUnit}
                </span>
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
          className="min-h-[46px] rounded-sm border border-dashed border-green px-2.5 text-sm text-green-dark disabled:opacity-60"
        >
          {creating
            ? "登録しています…"
            : `該当する食材がない場合は「${keyword}」を新しく作成（単位 ${unit}）`}
        </button>
      )}

      <FieldError message={error} />
    </div>
  );
}
