/**
 * 在庫との突き合わせの型。
 * 出典: docs/design/system.md 4.2
 */
import type { Dimension } from "../unit/units";
import type { DateOnly, RecipeIngredient, Unit, UUID } from "../../types";

/** 材料ごとの充足状態 */
export type MatchState =
  /** 在庫で賄える */
  | "satisfied"
  /** 常備食材のため判定対象外（F6-4） */
  | "staple"
  /** 在庫はあるが単位を換算できず数量比較ができない（F6-6） */
  | "unknown"
  /** 不足 */
  | "missing";

export interface IngredientMatch {
  ingredientId: UUID;
  ingredientName: string;
  required: { quantity: number; unit: Unit };
  state: MatchState;
  /** state === 'missing' のときのみ。表示用に required.unit で返す（F6-3） */
  shortage: { quantity: number; unit: Unit } | null;
}

/**
 * 食材ごと・次元ごとに合計した在庫（F6-5）。
 * 値は基準単位（質量=g、容量=ml、可算=その単位）での合計。
 */
export type StockTotals = Map<UUID, Map<Dimension, number>>;

/** 判定に必要な食材マスタの情報だけを受け取る */
export interface MatchableIngredient {
  name: string;
  isStaple: boolean;
}

/** 判定に必要な在庫の情報だけを受け取る */
export interface StockLot {
  ingredientId: UUID;
  quantity: number;
  unit: Unit;
  expiresAt: DateOnly | null;
}

/**
 * 提案の算出に必要なレシピの情報だけを受け取る。
 * Recipe（src/types）はこの形を満たすのでそのまま渡せる。
 */
export interface SuggestableRecipe {
  id: UUID;
  name: string;
  ingredients: RecipeIngredient[];
}

/** レシピ1件分の提案（F6-1〜F6-3） */
export interface RecipeSuggestion {
  recipeId: UUID;
  recipeName: string;
  matches: IngredientMatch[];
  /** state === 'missing' の件数。並び順の第1キー（F6-2） */
  missingCount: number;
  /** state === 'unknown' の件数。並び順の第2キー */
  unknownCount: number;
  /** 判定対象の材料数（常備食材を除く）。画面の「食材 3/4」の分母 */
  requiredCount: number;
  /** 充足した材料数。上記の分子 */
  satisfiedCount: number;
}
