import { z } from "zod";
import { isValidDateOnly } from "@/lib/date";
import { MEAL_SLOTS } from "@/types";

/**
 * 食事記録の入力検証（F4-1〜F4-3）。
 * 検証はサーバー側を正とする（docs/design/system.md 8.2 方針2）。
 * 文字数の上限は DB の CHECK 制約と揃える（docs/design/database.md 5.6, 5.7）。
 */

export const MEAL_NOTE_MAX = 200;
export const MEAL_ITEM_NAME_MAX = 100;
/** 1回の食事の品目数。DB に制約はないが、際限のない配列を受け取らないために置く */
export const MEAL_ITEMS_MAX = 20;

/** URL の [date] とフォームの日付。存在しない日付を DB へ渡さない */
export const mealDateSchema = z.string().refine(isValidDateOnly, "日付が正しくありません");

/** URL の [slot]。DB の meal_slot と同じ4値 */
export const mealSlotSchema = z.enum(MEAL_SLOTS, { message: "食事区分が正しくありません" });

export const mealIdSchema = z.uuid("記録が見つかりません");

const mealItemSchema = z.object({
  // null は自由入力。レシピ参照なら自分のレシピかを Server Action が照合する（F1-2）
  recipeId: z.uuid("レシピが見つかりません").nullable().default(null),
  displayName: z
    .string()
    .trim()
    .min(1, "料理名を入力してください")
    .max(MEAL_ITEM_NAME_MAX, `料理名は${MEAL_ITEM_NAME_MAX}文字以内で入力してください`),
});

export const mealSchema = z.object({
  // 品目0件の記録は残さない。空にしたいときは記録ごと削除する
  items: z
    .array(mealItemSchema)
    .min(1, "品目を1件以上追加してください")
    .max(MEAL_ITEMS_MAX, `品目は${MEAL_ITEMS_MAX}件まで登録できます`),

  note: z
    .string()
    .trim()
    .max(MEAL_NOTE_MAX, `メモは${MEAL_NOTE_MAX}文字以内で入力してください`)
    // 空欄は null として保存する（DB は NULL 許容）
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null),
});

export const mealSaveSchema = mealSchema.extend({
  date: mealDateSchema,
  slot: mealSlotSchema,
  /**
   * R-2 から来た場合の戻り先レシピ（NFR-9）。
   * 戻り先は URL ではなく ID で受け取り、パスはサーバー側で組み立てる。
   * 画面から来た文字列をそのまま redirect に渡さないため。
   */
  fromRecipeId: z.uuid().nullable().default(null),
});

export const mealDeleteSchema = z.object({
  id: mealIdSchema,
  date: mealDateSchema,
  slot: mealSlotSchema,
});

/** 画面から送られる形。既定値のあるキーは省略できる */
export type MealFormInput = z.input<typeof mealSaveSchema>;
