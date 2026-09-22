"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import { findIngredientsByIds } from "@/repositories/ingredients";
import {
  addInventoryQuantity,
  deleteInventory as deleteInventoryRow,
  insertInventory,
  updateInventory as updateInventoryRow,
} from "@/repositories/inventory";
import type { InventoryItem, UUID } from "@/types";
import {
  inventoryDeltaSchema,
  inventoryIdSchema,
  inventorySchema,
  type InventoryFormInput,
} from "@/validations/inventory";

/**
 * 在庫の Server Action（F5-1, F5-3）。
 * 出典: docs/design/system.md 7.2
 *
 * 画面から届く値は信用せず、Zod で検証し直す（docs/design/system.md 8.2 方針2）。
 * 追加・更新・削除は完了後に P-1 へ戻すので、成功時の戻り値を持たない。
 * 数量の増減だけは P-1 に留まるため、更新後の在庫を返す。
 */

export type InventoryState = ActionResult<never> | null;
export type QuantityState = ActionResult<InventoryItem> | null;

const LIST_PATH = "/pantry";

export async function addInventory(
  _prev: InventoryState,
  input: InventoryFormInput,
): Promise<InventoryState> {
  const user = await requireUser();
  const parsed = inventorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const forbidden = await assertOwnIngredient(user.id, parsed.data.ingredientId);
  if (forbidden) return forbidden;

  await insertInventory(user.id, parsed.data);

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

export async function updateInventory(
  _prev: InventoryState,
  input: InventoryFormInput & { id: string },
): Promise<InventoryState> {
  const user = await requireUser();
  const id = inventoryIdSchema.safeParse(input.id);
  if (!id.success) return fail("NOT_FOUND", "在庫が見つかりません");

  const parsed = inventorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const forbidden = await assertOwnIngredient(user.id, parsed.data.ingredientId);
  if (forbidden) return forbidden;

  const result = await updateInventoryRow(user.id, id.data, parsed.data);
  if (!result.ok) return fail("NOT_FOUND", "在庫が見つかりません");

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id.data}/edit`);
  redirect(LIST_PATH);
}

/**
 * P-1 のステッパーからの数量変更（F5-3）。
 *
 * 絶対値ではなく差分を受け取り、加算は DB 側で行う
 * （docs/design/system.md 8.2 方針4）。ボタンの submit で送るため FormData で受ける。
 */
export async function changeInventoryQuantity(
  _prev: QuantityState,
  formData: FormData,
): Promise<QuantityState> {
  const user = await requireUser();
  const id = inventoryIdSchema.safeParse(formData.get("id"));
  if (!id.success) return fail("NOT_FOUND", "在庫が見つかりません");

  const delta = inventoryDeltaSchema.safeParse(formData.get("delta"));
  if (!delta.success) return fail("VALIDATION_ERROR", "数量を変更できません");

  const result = await addInventoryQuantity(user.id, id.data, delta.data);
  if (!result.ok) return fail("NOT_FOUND", "在庫が見つかりません");

  // 一覧に留まるので、リダイレクトせず再描画だけを促す
  revalidatePath(LIST_PATH);
  return ok(result.data);
}

export async function deleteInventory(
  _prev: InventoryState,
  formData: FormData,
): Promise<InventoryState> {
  const user = await requireUser();
  const id = inventoryIdSchema.safeParse(formData.get("id"));
  if (!id.success) return fail("NOT_FOUND", "在庫が見つかりません");

  await deleteInventoryRow(user.id, id.data);

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

function invalid(issues: readonly { path: PropertyKey[]; message: string }[]): ActionResult<never> {
  return fail("VALIDATION_ERROR", "入力内容を確認してください", toFieldErrors(issues));
}

/**
 * 在庫に紐づける食材が自分のものか確かめる（F1-2）。
 * 外部キーは存在しか見ないため、他オーナーの食材 ID を混ぜられないようここで弾く。
 */
async function assertOwnIngredient(
  ownerId: UUID,
  ingredientId: UUID,
): Promise<ActionResult<never> | null> {
  const owned = await findIngredientsByIds(ownerId, [ingredientId]);

  if (owned.length === 0) {
    return fail("FORBIDDEN", "操作できません", {
      ingredientId: "選べない食材です。食材を選び直してください",
    });
  }

  return null;
}
