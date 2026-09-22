/**
 * エンティティ型。
 *
 * 出典: docs/design/system.md 4.1
 * DB の行そのものではなく、画面とドメインが受け渡す形を定義する。
 * 単位は domain/unit を唯一の出典とする（docs/design/database.md 3章）。
 */
export type { Unit } from "@/domain/unit/units";

import type { Unit } from "@/domain/unit/units";

export type UUID = string;

/** YYYY-MM-DD。保存は UTC、表示は Asia/Tokyo（NFR-11） */
export type DateOnly = string;

/** 食材マスタ（F2-1） */
export interface Ingredient {
  id: UUID;
  ownerId: UUID;
  name: string;
  defaultUnit: Unit;
  /** 常備食材。true なら不足判定から除外する（F6-4） */
  isStaple: boolean;
  createdAt: Date;
}

/** 食材の登録・更新で受け取る値。検証は src/validations/ingredient.ts が行う */
export type IngredientInput = Pick<Ingredient, "name" | "defaultUnit" | "isStaple">;

/** 食材を参照している件数。削除の可否判定に使う（docs/design/database.md 4章） */
export interface IngredientUsage {
  recipes: number;
  inventoryItems: number;
}

/** レシピ材料（F3-2）。単位は食材の標準単位と異なってよい */
export interface RecipeIngredient {
  ingredientId: UUID;
  quantity: number;
  unit: Unit;
}

/** 画面表示用に食材名を添えた材料 */
export interface RecipeIngredientDetail extends RecipeIngredient {
  name: string;
  isStaple: boolean;
}

/** レシピ（F3-1, F3-2）。材料は1件以上（検証は Zod が担う） */
export interface Recipe {
  id: UUID;
  ownerId: UUID;
  name: string;
  ingredients: RecipeIngredientDetail[];
  /** 表示順に並んだ手順の本文 */
  steps: string[];
  note: string | null;
}

/** R-1 のカードに出す一覧向けの形。材料は名前だけを持つ */
export interface RecipeSummary {
  id: UUID;
  name: string;
  ingredientCount: number;
  ingredientNames: string[];
}

/** 在庫（F5-1）。同じ食材を複数ロット持て、期限を個別に管理する */
export interface InventoryItem {
  id: UUID;
  ownerId: UUID;
  ingredientId: UUID;
  quantity: number;
  unit: Unit;
  /** 任意。null は期限なしで、期限切れ判定の対象外（F5-5） */
  expiresAt: DateOnly | null;
}

/** 在庫の登録・更新で受け取る値。検証は src/validations/inventory.ts が行う */
export type InventoryInput = Pick<
  InventoryItem,
  "ingredientId" | "quantity" | "unit" | "expiresAt"
>;

/** P-1・P-3 の表示用に食材名を添えた在庫 */
export interface InventoryListItem extends InventoryItem {
  ingredientName: string;
}

/** レシピの登録・更新で受け取る値。検証は src/validations/recipe.ts が行う */
export interface RecipeInput {
  name: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  note: string | null;
}

/** 食事区分（F4-1）。値は DB の meal_slot と並び順まで揃える */
export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

/**
 * 食事記録の品目（F4-2, F4-3）。
 *
 * レシピ参照か自由入力かは recipeId の有無で決まる。表示名は常に持つ
 * （登録時点の料理名を複写する / docs/design/database.md 4章）。
 */
export interface MealItem {
  id: UUID;
  /** 自由入力の場合と、参照先のレシピを削除した後は null */
  recipeId: UUID | null;
  displayName: string;
  /** 表示順。1始まり */
  position: number;
}

/** 食事記録（F4-1〜F4-3）。1日1区分につき1件で、複数の品目を持つ */
export interface Meal {
  id: UUID;
  ownerId: UUID;
  date: DateOnly;
  slot: MealSlot;
  items: MealItem[];
  note: string | null;
}

/** 記録の保存で受け取る品目。position は並び順から決めるので持たない */
export interface MealItemInput {
  recipeId: UUID | null;
  displayName: string;
}

/** 記録の保存で受け取る値。検証は src/validations/meal.ts が行う */
export interface MealInput {
  items: MealItemInput[];
  note: string | null;
}

/** M-1 のカレンダー1日分（F4-4）。記録のある区分だけを持つ */
export interface MealCalendarDay {
  date: DateOnly;
  slots: MealSlot[];
}
