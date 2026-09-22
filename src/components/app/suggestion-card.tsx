import Link from "next/link";
import type { RecipeSuggestion } from "@/domain/suggestion";
import { IngredientTag } from "./ingredient-tag";

/**
 * S-1 の提案カード（F6-1〜F6-4, F6-6）。
 *
 * 充足数は「食材 3/4」の形式。分母は常備食材を除いた材料数（F6-4）。
 * 在庫のある材料は色つきタグ、不足している材料は点線枠のタグにする（F6-3）。
 * 常備食材はタグに出さない。
 */
export function SuggestionCard({
  suggestion,
  featured,
}: {
  suggestion: RecipeSuggestion;
  /** 先頭の1件だけ「イチオシ」を付ける */
  featured?: boolean;
}) {
  const tags = suggestion.matches.filter((match) => match.state !== "staple");
  const shortages = suggestion.matches.filter((match) => match.shortage !== null);

  return (
    <Link
      href={`/recipes/${suggestion.recipeId}`}
      className="flex items-start gap-3 rounded-md bg-white p-3 shadow-sm"
    >
      <span
        className="grid size-14 shrink-0 place-items-center rounded-sm bg-mint text-2xl"
        aria-hidden
      >
        🍲
      </span>

      <span className="flex flex-1 flex-col gap-1.5">
        {featured && (
          <span className="self-start rounded-full bg-warn-bg px-2.5 py-0.5 text-[10px] font-bold text-warn">
            イチオシ
          </span>
        )}

        <span className="font-heading leading-snug font-bold">{suggestion.recipeName}</span>

        <span className="text-xs text-ink-mid">
          食材{" "}
          <b className="text-ink">
            {suggestion.satisfiedCount}/{suggestion.requiredCount}
          </b>
          {suggestion.unknownCount > 0 && (
            <span className="ml-2">数量不明 {suggestion.unknownCount}件</span>
          )}
        </span>

        {tags.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {tags.map((match) => (
              <IngredientTag
                key={match.ingredientId}
                name={match.ingredientName}
                missing={match.state === "missing"}
              />
            ))}
          </span>
        )}

        {shortages.length > 0 && (
          <span className="text-xs text-warn">
            不足:{" "}
            {shortages
              .map(
                (match) =>
                  `${match.ingredientName} あと${match.shortage?.quantity}${match.shortage?.unit}`,
              )
              .join("・")}
          </span>
        )}
      </span>
    </Link>
  );
}
