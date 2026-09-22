import { z } from "zod";
import { UNITS } from "@/domain/unit/units";

/**
 * 在庫の入力検証（F5-1, F5-3）。
 * 検証はサーバー側を正とする（docs/design/system.md 8.2 方針2）。
 * 数量の範囲は DB の型と CHECK に揃える（docs/design/database.md 5.5）。
 */

/** numeric(10,2) の上限 */
export const QUANTITY_MAX = 99999999.99;

/**
 * 空欄や未送信を 0 と読み替えないよう、数値化する前に弾く。
 * Number("") も Number(null) も 0 になるため、coerce の前に落とす。
 */
const blankToUndefined = (value: unknown) =>
  value === null || (typeof value === "string" && value.trim() === "") ? undefined : value;

const quantity = z.preprocess(
  blankToUndefined,
  z.coerce
    .number({ message: "数量を入力してください" })
    // 使い切った在庫は0のまま行を残す（F5-3）
    .nonnegative("数量は0以上で入力してください")
    .max(QUANTITY_MAX, "数量が大きすぎます"),
);

const unit = z.enum(UNITS, { message: "単位を選択してください" });

/**
 * 賞味期限は任意（F5-1）。
 * input[type=date] は未入力だと空文字を送るため、期限なし（null）として扱う。
 */
const expiresAt = z
  .string()
  .trim()
  .nullable()
  .default(null)
  .transform((value) => (value === "" ? null : value))
  .refine(
    (value) => value === null || isCalendarDate(value),
    "賞味期限は YYYY-MM-DD の実在する日付で入力してください",
  );

export const inventorySchema = z.object({
  ingredientId: z.uuid("食材を選んでください"),
  quantity,
  unit,
  expiresAt,
});

export const inventoryIdSchema = z.uuid("在庫が見つかりません");

/**
 * 数量の増減（F5-3）。絶対値ではなく差分を受け取る
 * （docs/design/system.md 8.2 方針4）。
 */
export const inventoryDeltaSchema = z.preprocess(
  blankToUndefined,
  z.coerce
    .number({ message: "数量を変更できません" })
    .min(-QUANTITY_MAX, "変更量が大きすぎます")
    .max(QUANTITY_MAX, "変更量が大きすぎます"),
);

/** 画面から送られる形。検証前なので数量は文字列でもよい */
export type InventoryFormInput = z.input<typeof inventorySchema>;

/** 2026-02-30 のような存在しない日付を弾く。正規表現だけでは通ってしまう */
function isCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
