import Link from "next/link";
import { notFound } from "next/navigation";
import { StockBadge } from "@/components/app/stock-badge";
import { SubBar } from "@/components/app/sub-bar";
import { requireUser } from "@/lib/auth";
import { currentMealSlot, todayInTokyo } from "@/lib/date";
import { getRecipeWithStock } from "@/repositories/recipes";
import { recipeIdSchema } from "@/validations/recipe";

/**
 * R-2 レシピ詳細 `/recipes/[id]`
 * 画面定義: docs/design/screen-design.md 5章
 *
 * 在庫の充足判定は提案アルゴリズムと同じドメイン関数で行う（F3-4, F6-4, F6-6）。
 */
export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = recipeIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const user = await requireUser();
  const now = new Date();
  const recipe = await getRecipeWithStock(user.id, parsedId.data, todayInTokyo(now));
  if (!recipe) notFound();

  // M-3 には当日と直近の食事区分を引き継ぐ（NFR-9）
  const recordHref = `/meals/${todayInTokyo(now)}/${currentMealSlot(now)}/edit?recipeId=${recipe.id}`;

  return (
    <main className="flex flex-col gap-3.5">
      <SubBar
        title="レシピ"
        backHref="/recipes"
        action={
          <Link href={`/recipes/${recipe.id}/edit`} className="text-sm text-green-dark underline">
            編集
          </Link>
        }
      />

      <section className="rounded-md bg-mint p-4">
        <h2 className="font-heading text-2xl leading-snug font-bold">{recipe.name}</h2>
      </section>

      <section className="flex flex-col gap-2 rounded-md bg-white p-3.5 shadow-sm">
        <h3 className="font-heading font-bold">材料</h3>
        <ul className="flex flex-col gap-2">
          {recipe.matches.map((match) => (
            <li key={match.ingredientId} className="flex items-center gap-2">
              <span className="flex-1">
                <span className="block font-bold">{match.ingredientName}</span>
                <span className="block text-xs text-ink-mid">
                  {match.required.quantity}
                  {match.required.unit}
                </span>
              </span>
              <StockBadge match={match} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-mid">常備食材は不足判定から除外されます</p>
      </section>

      {recipe.steps.length > 0 && (
        <section className="flex flex-col gap-2 rounded-md bg-white p-3.5 shadow-sm">
          <h3 className="font-heading font-bold">作り方</h3>
          <ol className="flex flex-col gap-2">
            {recipe.steps.map((step, index) => (
              <li key={`${index}-${step}`} className="flex items-start gap-2">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-green-tint text-xs font-bold text-green-dark">
                  {index + 1}
                </span>
                <span className="text-sm whitespace-pre-line">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* メモが未入力の場合はメモ欄を表示しない（画面設計 R-2） */}
      {recipe.note && (
        <section className="flex flex-col gap-1.5 rounded-md bg-white p-3.5 shadow-sm">
          <h3 className="font-heading font-bold">メモ</h3>
          <p className="text-sm whitespace-pre-line">{recipe.note}</p>
        </section>
      )}

      <Link
        href={recordHref}
        className="grid min-h-[52px] place-items-center rounded-lg bg-green font-heading font-bold text-cream"
      >
        食べた記録をつける
      </Link>
    </main>
  );
}
