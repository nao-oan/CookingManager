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

/** レシピの登録・更新で受け取る値。検証は src/validations/recipe.ts が行う */
export interface RecipeInput {
  name: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  note: string | null;
}
