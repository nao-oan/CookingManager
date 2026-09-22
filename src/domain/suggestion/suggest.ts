/**
 * 提案アルゴリズム本体（F6-1〜F6-6, F5-5）。
 *
 * 出典: docs/design/system.md 5.2 手順4・手順5
 * 在庫の集計と材料ごとの判定（手順1〜3）は match.ts に置いてあり、R-2 のレシピ詳細と
 * 共用する。ここではレシピごとの集計と並べ替えだけを行う。
 */
import { aggregateStock, earliestExpiryByIngredient, matchIngredients } from "./match";
import type { DateOnly, UUID } from "../../types";
import type {
  IngredientMatch,
  MatchableIngredient,
  RecipeSuggestion,
  StockLot,
  SuggestableRecipe,
} from "./types";

/**
 * 在庫から作れるレシピを、不足の少ない順に並べて返す（F6-1, F6-2）。
 *
 * DB もフレームワークも参照しない純関数なので、配列を組み立てれば単体テストできる（NFR-13）。
 * レシピ200件・在庫100件でも Map 参照だけの O(レシピ数 × 材料数) で済む（NFR-2）。
 */
export function suggest(
  recipes: SuggestableRecipe[],
  inventory: StockLot[],
  ingredients: Map<UUID, MatchableIngredient>,
  today: DateOnly,
): RecipeSuggestion[] {
  // 手順1・手順2。在庫の走査はレシピごとではなく一度だけ行う
  const stock = aggregateStock(inventory, today);
  const earliestExpiry = earliestExpiryByIngredient(inventory, today);

  const rows = recipes.map((recipe) => {
    // 手順3
    const matches = matchIngredients(recipe.ingredients, ingredients, stock);

    // 手順4。常備食材は「食材 3/4」の分母に数えない（F6-4）
    const suggestion: RecipeSuggestion = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      matches,
      missingCount: countState(matches, "missing"),
      unknownCount: countState(matches, "unknown"),
      requiredCount: matches.filter((match) => match.state !== "staple").length,
      satisfiedCount: countState(matches, "satisfied"),
    };

    return { suggestion, expiry: earliestExpiryOf(matches, earliestExpiry) };
  });

  // 手順5。第3キー・第4キーは設計上の決定（system.md 5.2 の脚注）
  rows.sort(
    (a, b) =>
      a.suggestion.missingCount - b.suggestion.missingCount ||
      a.suggestion.unknownCount - b.suggestion.unknownCount ||
      compareExpiry(a.expiry, b.expiry) ||
      a.suggestion.recipeName.localeCompare(b.suggestion.recipeName, "ja"),
  );

  return rows.map((row) => row.suggestion);
}

function countState(matches: IngredientMatch[], state: IngredientMatch["state"]): number {
  return matches.filter((match) => match.state === state).length;
}

/**
 * そのレシピを作るときに消費する在庫のうち、最も近い賞味期限。
 *
 * 常備食材は判定対象外（F6-4）なので、期限が付いていても順序には効かせない。
 * 期限付きの在庫をひとつも使わないレシピは null を返す。
 */
function earliestExpiryOf(
  matches: IngredientMatch[],
  earliestExpiry: Map<UUID, DateOnly>,
): DateOnly | null {
  let result: DateOnly | null = null;

  for (const match of matches) {
    if (match.state === "staple") continue;

    const expiry = earliestExpiry.get(match.ingredientId);
    if (expiry !== undefined && (result === null || expiry < result)) result = expiry;
  }

  return result;
}

/** 期限の近い在庫を使う案を上位に。期限付きの在庫を使わない案は後ろへ回す */
function compareExpiry(a: DateOnly | null, b: DateOnly | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}
