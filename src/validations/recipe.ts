import { z } from "zod";
import { UNITS } from "@/domain/unit/units";

/**
 * レシピの入力検証（F3-1, F3-2）。
 * 検証はサーバー側を正とする（docs/design/system.md 8.2 方針2）。
 * 文字数と数量の上限は DB の制約と揃える（docs/design/database.md 5.2〜5.4）。
 */

export const RECIPE_NAME_MAX = 100;
export const STEP_BODY_MAX = 500;
export const NOTE_MAX = 1000;
/** numeric(10,2) の上限 */
const QUANTITY_MAX = 99999999.99;

const recipeIngredientSchema = z.object({
  ingredientId: z.uuid("食材を選んでください"),
  quantity: z.coerce
    .number({ message: "数量を入力してください" })
    .positive("数量は0より大きい値を入力してください")
    .max(QUANTITY_MAX, "数量が大きすぎます"),
  unit: z.enum(UNITS, { message: "単位を選択してください" }),
});

export const recipeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "料理名を入力してください")
    .max(RECIPE_NAME_MAX, `料理名は${RECIPE_NAME_MAX}文字以内で入力してください`),

  // 材料1件以上は DB の CHECK で表現できないため、ここで担保する（F3-2）
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, "材料を1件以上追加してください")
    .refine(
      (rows) => new Set(rows.map((row) => row.ingredientId)).size === rows.length,
      "同じ食材が重複しています。1行にまとめてください",
    ),

  // 手順は任意。空行は画面側で落とす
  steps: z
    .array(
      z
        .string()
        .trim()
        .min(1, "手順を入力してください")
        .max(STEP_BODY_MAX, `手順は${STEP_BODY_MAX}文字以内で入力してください`),
    )
    .default([]),

  note: z
    .string()
    .trim()
    .max(NOTE_MAX, `メモは${NOTE_MAX}文字以内で入力してください`)
    // 空欄は null として保存する（DB は NULL 許容）
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null),
});

export const recipeIdSchema = z.uuid("レシピが見つかりません");

/** 画面から送られる形。検証前なので数量は文字列でもよい */
export type RecipeFormInput = z.input<typeof recipeSchema>;
