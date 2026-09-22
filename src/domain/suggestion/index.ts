/**
 * 在庫との突き合わせと提案の公開インターフェース。
 *
 * S-1 のレシピ提案は suggest を、R-2 の在庫表示は判定部分だけを使う。
 */
export { aggregateStock, earliestExpiryByIngredient, matchIngredients } from "./match";
export { suggest } from "./suggest";
export type {
  IngredientMatch,
  MatchableIngredient,
  MatchState,
  RecipeSuggestion,
  StockLot,
  StockTotals,
  SuggestableRecipe,
} from "./types";
