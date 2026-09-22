import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { RecipeCard } from "@/components/app/recipe-card";
import { requireUser } from "@/lib/auth";
import { listRecipes } from "@/repositories/recipes";

/**
 * R-1 レシピ一覧 `/recipes`
 * 画面定義: docs/design/screen-design.md 5章
 *
 * 検索語は URL に持たせ、JS なしでも絞り込めるようにする（F3-3）。
 */
export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const user = await requireUser();
  const query = q.trim();
  const found = await listRecipes(user.id, query);

  return (
    <main className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">レシピを探す</h1>
        <p className="max-w-[125px] text-xs leading-relaxed text-ink-mid">
          今日のごはんが
          <br />
          きっと見つかります！
        </p>
      </div>

      <form action="/recipes" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="料理名で検索"
          aria-label="料理名で検索"
          className="min-h-[50px] flex-1 rounded-sm border border-line bg-white px-3.5 text-[15px] placeholder:text-ink-weak"
        />
        <button
          type="submit"
          className="min-h-[50px] rounded-sm bg-mint px-4 font-bold text-green-dark"
        >
          検索
        </button>
      </form>

      {found.length === 0 ? (
        <EmptyState
          title={query ? "該当するレシピがありません" : "レシピがまだありません"}
          description={
            query ? "料理名を変えて検索してください" : "右下の＋から最初のレシピを登録できます"
          }
        />
      ) : (
        <section className="grid grid-cols-2 gap-2.5">
          {found.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              // R-2 詳細は #27 で実装する。それまでは編集画面へ送る
              href={`/recipes/${recipe.id}/edit`}
              name={recipe.name}
              ingredientCount={recipe.ingredientCount}
              ingredientNames={recipe.ingredientNames}
            />
          ))}
        </section>
      )}

      {/* 新規作成の FAB。画面幅390pxの右下、下部タブ（84px）と重ならない高さに置く */}
      <Link
        href="/recipes/new"
        aria-label="レシピを新規作成"
        className="fixed bottom-[100px] left-1/2 ml-[121px] grid size-14 place-items-center rounded-full bg-green text-3xl text-cream shadow-lg"
      >
        ＋
      </Link>
    </main>
  );
}
