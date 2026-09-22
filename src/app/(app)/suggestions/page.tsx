import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { ExpiryBadge } from "@/components/app/expiry-badge";
import { SuggestionCard } from "@/components/app/suggestion-card";
import { requireUser } from "@/lib/auth";
import { currentMealSlot, todayInTokyo } from "@/lib/date";
import { getSuggestions } from "@/repositories/suggestions";

/**
 * S-1 レシピ提案 `/suggestions`
 * 画面定義: docs/design/screen-design.md 5章、モックアップ mockups/html/s-1.html
 *
 * ログイン後の初期表示画面。算出はサーバー側で行い、クライアントへは
 * 提案の配列だけを送る（NFR-3）。
 */
export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ use?: string | string[] }>;
}) {
  const { use } = await searchParams;
  const selected = typeof use === "string" ? [use] : (use ?? []);

  const user = await requireUser();
  const now = new Date();
  const today = todayInTokyo(now);
  const { suggestions, expiring, hasRecipes, hasStock } = await getSuggestions(
    user.id,
    today,
    selected,
  );

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-lg font-bold">{greeting(now)}</p>
          <p className="text-xs text-ink-mid">今日もおつかれさまです！</p>
        </div>
        <Link href="/settings" aria-label="設定" className="text-xl text-green">
          ⚙
        </Link>
      </header>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-heading font-bold">いま使いたい食材</h2>
          <Link href="/pantry" className="text-xs text-green-dark underline">
            冷蔵庫の食材を編集 ›
          </Link>
        </div>

        {expiring.length === 0 ? (
          <p className="rounded-md bg-mint px-3 py-2 text-sm text-ink-mid">
            期限の近い食材はありません。
          </p>
        ) : (
          <form action="/suggestions" className="flex flex-col gap-2">
            <p className="text-xs text-ink-mid">
              賞味期限が近い食材から、今夜のごはんを考えましょう。
            </p>

            {expiring.map((item) => (
              <label
                key={item.ingredientId}
                className="flex items-center gap-2.5 rounded-md bg-white p-3 shadow-sm"
              >
                <input
                  type="checkbox"
                  name="use"
                  value={item.ingredientId}
                  defaultChecked={selected.includes(item.ingredientId)}
                  className="size-5 accent-green"
                />
                <span className="flex-1">
                  <span className="block font-bold">{item.name}</span>
                  <span className="block text-xs text-ink-mid">
                    {item.quantity}
                    {item.unit}
                  </span>
                </span>
                <ExpiryBadge expiresAt={item.expiresAt} today={today} />
              </label>
            ))}

            <div className="flex gap-2">
              <button
                type="submit"
                className="min-h-[44px] flex-1 rounded-lg bg-green font-heading font-bold text-cream"
              >
                この組み合わせで作る
              </button>
              {selected.length > 0 && (
                <Link
                  href="/suggestions"
                  className="grid min-h-[44px] place-items-center rounded-lg bg-mint px-4 font-bold text-green-dark"
                >
                  解除
                </Link>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-heading font-bold">おすすめの組み合わせ</h2>
          <span className="text-xs text-ink-mid">冷蔵庫の食材からおすすめ！</span>
        </div>

        {/* 空状態は2種類を出し分ける（F6-7） */}
        {!hasRecipes ? (
          <EmptyState
            title="レシピがまだありません"
            description="レシピを登録すると、冷蔵庫の食材から作れるものを提案します"
          />
        ) : !hasStock ? (
          <EmptyState
            title="在庫がまだありません"
            description="冷蔵庫の食材を登録すると、作れるレシピから順に並べます"
          />
        ) : suggestions.length === 0 ? (
          <EmptyState
            title="選んだ食材を使うレシピがありません"
            description="選択を解除するか、食材を減らして試してください"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.recipeId}
                suggestion={suggestion}
                featured={index === 0 && suggestion.missingCount === 0}
              />
            ))}
          </div>
        )}

        {!hasRecipes && (
          <Link
            href="/recipes/new"
            className="grid min-h-[52px] place-items-center rounded-lg bg-green font-heading font-bold text-cream"
          >
            レシピを登録する
          </Link>
        )}
        {hasRecipes && !hasStock && (
          <Link
            href="/pantry/new"
            className="grid min-h-[52px] place-items-center rounded-lg bg-green font-heading font-bold text-cream"
          >
            冷蔵庫に食材を追加する
          </Link>
        )}
      </section>
    </main>
  );
}

/** 時間帯のあいさつ。区分は lib/date の食事区分に合わせる */
function greeting(now: Date): string {
  switch (currentMealSlot(now)) {
    case "breakfast":
      return "おはようございます 🌅";
    case "lunch":
      return "こんにちは ☀️";
    default:
      return "こんばんは 🌙";
  }
}
