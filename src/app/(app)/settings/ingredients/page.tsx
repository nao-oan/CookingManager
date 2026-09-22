import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { SubBar } from "@/components/app/sub-bar";
import { ingredientThumbnail } from "@/domain/thumbnail/thumbnail";
import { requireUser } from "@/lib/auth";
import { listIngredients } from "@/repositories/ingredients";
import { IngredientCreateForm } from "./ingredient-create-form";

/**
 * C-2 食材一覧 `/settings/ingredients`
 * 画面定義: docs/design/screen-design.md 5章
 *
 * 検索と絞り込みは URL に持たせ、JS なしでも動くようにする。
 */
export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q = "", filter } = await searchParams;
  const user = await requireUser();
  const stapleOnly = filter === "staple";
  const found = await listIngredients(user.id, { query: q.trim(), stapleOnly });
  const filtered = q.trim() !== "" || stapleOnly;

  return (
    <main className="flex flex-col gap-3">
      <SubBar title="食材一覧" backHref="/settings" />
      <p className="text-center text-sm text-ink-mid">食材マスタを検索・編集できます</p>

      <form action="/settings/ingredients" className="flex gap-2">
        {stapleOnly && <input type="hidden" name="filter" value="staple" />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="食材名で検索"
          aria-label="食材名で検索"
          className="min-h-[52px] flex-1 rounded-sm border border-line bg-white px-3.5 text-[15px] placeholder:text-ink-weak"
        />
        <button
          type="submit"
          className="min-h-[52px] rounded-sm bg-mint px-4 font-bold text-green-dark"
        >
          検索
        </button>
      </form>

      <div className="flex items-center justify-between">
        <span className="text-sm">{filtered ? `${found.length}件` : `全${found.length}件`}</span>
        <div className="flex gap-1.5">
          <FilterChip label="すべて" href={chipHref(q, false)} active={!stapleOnly} />
          <FilterChip label="常備食材" href={chipHref(q, true)} active={stapleOnly} />
        </div>
      </div>

      {found.length === 0 ? (
        <EmptyState
          title={filtered ? "該当する食材がありません" : "食材がまだありません"}
          description={
            filtered ? "検索語や絞り込みを変えてください" : "下のフォームから登録できます"
          }
        />
      ) : (
        <section className="flex flex-col gap-2">
          {found.map((ingredient) => (
            <Link
              key={ingredient.id}
              href={`/settings/ingredients/${ingredient.id}/edit`}
              className="flex items-center gap-2 rounded-md bg-white p-3 shadow-sm"
            >
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-sm bg-mint text-xl"
              >
                {ingredientThumbnail(ingredient.name)}
              </span>
              <span className="flex-1">
                <span className="block font-heading font-bold">{ingredient.name}</span>
                <span className="block text-xs text-ink-mid">
                  標準単位 <b className="text-ink">{ingredient.defaultUnit}</b>
                </span>
              </span>
              {ingredient.isStaple ? (
                <span className="rounded-full bg-green-tint px-2.5 py-1 text-xs text-green-dark">
                  常備食材
                </span>
              ) : (
                <span className="rounded-full bg-mint px-2.5 py-1 text-xs text-ink-mid">
                  通常食材
                </span>
              )}
              <span aria-hidden className="text-ink-weak">
                ›
              </span>
            </Link>
          ))}
        </section>
      )}

      <p className="rounded-sm bg-warn-bg px-3 py-2 text-xs text-warn">
        常備食材はレシピ提案の不足判定から除外されます
      </p>

      <IngredientCreateForm />
    </main>
  );
}

/** 絞り込みチップ。検索語は保ったまま切り替える */
function chipHref(query: string, stapleOnly: boolean): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (stapleOnly) params.set("filter", "staple");
  const search = params.toString();
  return search ? `/settings/ingredients?${search}` : "/settings/ingredients";
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full px-3 py-1.5 text-xs ${
        active ? "bg-green font-bold text-cream" : "bg-white text-ink-mid ring-1 ring-line"
      }`}
    >
      {label}
    </Link>
  );
}
