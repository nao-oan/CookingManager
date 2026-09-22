import { z } from "zod";
import { UNITS } from "@/domain/unit/units";

/**
 * 食材の入力検証（F2-1）。
 * 検証はサーバー側を正とする（docs/design/system.md 8.2 方針2）。
 * 文字数の上限は DB の CHECK 制約と揃える（docs/design/database.md 5.1）。
 */

export const INGREDIENT_NAME_MAX = 50;

const name = z
  .string()
  .trim()
  .min(1, "食材名を入力してください")
  .max(INGREDIENT_NAME_MAX, `食材名は${INGREDIENT_NAME_MAX}文字以内で入力してください`);

const defaultUnit = z.enum(UNITS, { message: "標準単位を選択してください" });

export const ingredientSchema = z.object({
  name,
  defaultUnit,
  // チェックボックス未選択時は FormData にキーが無いため、既定を false にする
  isStaple: z.boolean().default(false),
});

export const ingredientIdSchema = z.uuid("食材が見つかりません");

/** 検索語。空文字は「絞り込みなし」として扱う */
export const searchQuerySchema = z.string().trim().max(INGREDIENT_NAME_MAX).default("");

export type IngredientInput = z.infer<typeof ingredientSchema>;
