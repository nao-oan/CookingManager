import Link from "next/link";
import { IngredientTag } from "./ingredient-tag";

/**
 * R-1 の2列グリッドに並べるレシピカード。
 *
 * 在庫との突き合わせ（`食材 4/4`）は在庫機能が入ってから足す（#28, #30）。
 * ここでは材料の件数とタグだけを出す。
 */
export function RecipeCard({
  href,
  name,
  ingredientCount,
  ingredientNames,
}: {
  href: string;
  name: string;
  ingredientCount: number;
  ingredientNames: string[];
}) {
  return (
    <Link href={href} className="flex flex-col gap-1.5 rounded-md bg-white p-2 shadow-sm">
      <span className="grid h-[88px] place-items-center rounded-sm bg-mint text-3xl" aria-hidden>
        🍲
      </span>
      <span className="min-h-[38px] font-heading text-sm leading-snug font-bold">{name}</span>
      <span className="text-[11px] text-ink-mid">材料 {ingredientCount}件</span>
      {ingredientNames.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {ingredientNames.map((ingredientName) => (
            <IngredientTag key={ingredientName} name={ingredientName} />
          ))}
        </span>
      )}
    </Link>
  );
}
