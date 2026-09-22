"use client";

import { useEffect, useState } from "react";

/**
 * 品目に入れるレシピの検索（F4-2）。
 *
 * 入力しながら /api/recipes/search を呼んで候補を出す。
 * 食材の選択（src/app/(app)/recipes/ingredient-picker.tsx）と同じ作りだが、
 * こちらはその場で新規作成しない。レシピが無ければ自由入力へ切り替える。
 */

export type PickedRecipe = { id: string; name: string };

/** 逐次呼び出しの間隔。打鍵ごとに投げない */
const DEBOUNCE_MS = 250;

export function RecipePicker({ onPick }: { onPick: (recipe: PickedRecipe) => void }) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<PickedRecipe[]>([]);

  const keyword = query.trim();

  useEffect(() => {
    if (keyword === "") return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/recipes/search?q=${encodeURIComponent(keyword)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body: { ok: boolean; data?: PickedRecipe[] } = await response.json();
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

  // 入力が空のときは前回の候補を見せない（effect 内で state を消さないため）
  const visible = keyword === "" ? [] : candidates;

  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="レシピを検索"
        aria-label="レシピを検索"
        autoComplete="off"
        className="min-h-[44px] rounded-sm border border-line bg-white px-3 text-sm placeholder:text-ink-weak"
      />

      {keyword !== "" && visible.length === 0 && (
        <p className="text-xs text-ink-mid">
          該当するレシピがありません。自由入力に切り替えて登録できます。
        </p>
      )}

      {visible.length > 0 && (
        <ul className="flex flex-col gap-1">
          {visible.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(candidate);
                  setQuery("");
                }}
                className="min-h-[44px] w-full rounded-sm bg-mint px-3 text-left text-sm font-bold text-green-dark"
              >
                {candidate.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
