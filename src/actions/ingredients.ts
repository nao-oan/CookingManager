"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import {
  deleteIngredient as deleteIngredientRow,
  findIngredientByName,
  findIngredientUsage,
  insertIngredient,
  updateIngredient as updateIngredientRow,
} from "@/repositories/ingredients";
import type { Ingredient, IngredientUsage } from "@/types";
import { ingredientIdSchema, ingredientSchema } from "@/validations/ingredient";

/**
 * 食材マスタの Server Action（F2-1, F2-3）。
 * 出典: docs/design/system.md 7.2
 *
 * useActionState から使うため、第1引数に直前の状態を受け取る。
 * 編集・削除は完了後に C-2 へ戻すので、成功時の戻り値を持たない。
 */

export type IngredientState = ActionResult<Ingredient> | null;
type VoidState = ActionResult<never> | null;

const LIST_PATH = "/settings/ingredients";

function parseInput(formData: FormData) {
  return ingredientSchema.safeParse({
    name: formData.get("name"),
    defaultUnit: formData.get("defaultUnit"),
    // チェックボックスは未選択だとキーが送られない
    isStaple: formData.get("isStaple") === "on",
  });
}

/** 参照件数を文言にする。C-3 で削除を止める理由として見せる（docs/design/database.md 4章） */
function usageMessage(usage: IngredientUsage): string {
  const parts: string[] = [];
  if (usage.recipes > 0) parts.push(`レシピ${usage.recipes}件`);
  if (usage.inventoryItems > 0) parts.push(`在庫${usage.inventoryItems}件`);
  return `${parts.join("・")}から使われているため削除できません`;
}

export async function createIngredient(
  _prev: IngredientState,
  formData: FormData,
): Promise<IngredientState> {
  const user = await requireUser();
  const parsed = parseInput(formData);

  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      "入力内容を確認してください",
      toFieldErrors(parsed.error.issues),
    );
  }

  // 同名があれば作らせない（F2-3）。画面は候補を選び直させる
  const duplicated = await findIngredientByName(user.id, parsed.data.name);
  if (duplicated) return conflict(parsed.data.name);

  const result = await insertIngredient(user.id, parsed.data);
  if (!result.ok) return conflict(parsed.data.name);

  revalidatePath(LIST_PATH);
  return ok(result.data);
}

export async function updateIngredient(_prev: VoidState, formData: FormData): Promise<VoidState> {
  const user = await requireUser();
  const id = ingredientIdSchema.safeParse(formData.get("id"));
  if (!id.success) return fail("NOT_FOUND", "食材が見つかりません");

  const parsed = parseInput(formData);
  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      "入力内容を確認してください",
      toFieldErrors(parsed.error.issues),
    );
  }

  const result = await updateIngredientRow(user.id, id.data, parsed.data);

  if (!result.ok) {
    if (result.reason === "CONFLICT") return conflict(parsed.data.name);
    return fail("NOT_FOUND", "食材が見つかりません");
  }

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id.data}/edit`);
  redirect(LIST_PATH);
}

export async function deleteIngredient(_prev: VoidState, formData: FormData): Promise<VoidState> {
  const user = await requireUser();
  const id = ingredientIdSchema.safeParse(formData.get("id"));
  if (!id.success) return fail("NOT_FOUND", "食材が見つかりません");

  // レシピや在庫から参照されている食材は消せない（ON DELETE RESTRICT）
  const usage = await findIngredientUsage(user.id, id.data);
  if (usage.recipes > 0 || usage.inventoryItems > 0) {
    return fail("CONFLICT", usageMessage(usage));
  }

  const result = await deleteIngredientRow(user.id, id.data);

  // 事前確認の後に参照が増えた場合。DB 側の制約で止まる
  if (!result.ok) {
    return fail("CONFLICT", usageMessage(await findIngredientUsage(user.id, id.data)));
  }

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

function conflict(name: string): ActionResult<never> {
  return fail("CONFLICT", `「${name}」は登録済みです`, {
    name: "同じ名前の食材があります",
  });
}
