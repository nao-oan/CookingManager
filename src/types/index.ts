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
