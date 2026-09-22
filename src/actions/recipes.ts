"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fail, toFieldErrors, type ActionResult } from "@/lib/result";
import { findIngredientsByIds } from "@/repositories/ingredients";
import {
  deleteRecipe as deleteRecipeRow,
  insertRecipe,
  updateRecipe as updateRecipeRow,
} from "@/repositories/recipes";
import type { RecipeInput, UUID } from "@/types";
import { recipeIdSchema, recipeSchema, type RecipeFormInput } from "@/validations/recipe";

/**
 * レシピの Server Action（F3-1, F3-2）。
 * 出典: docs/design/system.md 7.2
 *
 * 材料と手順は行数が可変なので、FormData ではなく構造化した値を受け取る。
 * 画面から届く値は信用せず、Zod で検証し直す（docs/design/system.md 8.2 方針2）。
 * 成功後は一覧へ戻すため、成功時の戻り値を持たない。
 */

export type RecipeState = ActionResult<never> | null;

const LIST_PATH = "/recipes";

function invalid(issues: readonly { path: PropertyKey[]; message: string }[]): ActionResult<never> {
  return fail("VALIDATION_ERROR", "入力内容を確認してください", toFieldErrors(issues));
}

/**
 * 材料の食材が自分のものか確かめる（F1-2）。
 * 外部キーは存在しか見ないため、他オーナーの食材 ID を混ぜられないようここで弾く。
 */
async function assertOwnIngredients(
  ownerId: UUID,
  input: RecipeInput,
): Promise<ActionResult<never> | null> {
  const ids = [...new Set(input.ingredients.map((member) => member.ingredientId))];
  const owned = await findIngredientsByIds(ownerId, ids);

  if (owned.length !== ids.length) {
    return fail("FORBIDDEN", "操作できません", {
      ingredients: "選べない食材が含まれています。行を削除して選び直してください",
    });
  }

  return null;
}

export async function createRecipe(
  _prev: RecipeState,
  input: RecipeFormInput,
): Promise<RecipeState> {
  const user = await requireUser();
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const forbidden = await assertOwnIngredients(user.id, parsed.data);
  if (forbidden) return forbidden;

  await insertRecipe(user.id, parsed.data);

  revalidatePath(LIST_PATH);
  // 画面設計では保存後に R-2 へ送る。詳細画面は #27 で実装するため、今は一覧へ戻す
  redirect(LIST_PATH);
}

export async function updateRecipe(
  _prev: RecipeState,
  input: RecipeFormInput & { id: string },
): Promise<RecipeState> {
  const user = await requireUser();
  const id = recipeIdSchema.safeParse(input.id);
  if (!id.success) return fail("NOT_FOUND", "レシピが見つかりません");

  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const forbidden = await assertOwnIngredients(user.id, parsed.data);
  if (forbidden) return forbidden;

  const result = await updateRecipeRow(user.id, id.data, parsed.data);
  if (!result.ok) return fail("NOT_FOUND", "レシピが見つかりません");

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id.data}/edit`);
  redirect(LIST_PATH);
}

export async function deleteRecipe(_prev: RecipeState, formData: FormData): Promise<RecipeState> {
  const user = await requireUser();
  const id = recipeIdSchema.safeParse(formData.get("id"));
  if (!id.success) return fail("NOT_FOUND", "レシピが見つかりません");

  await deleteRecipeRow(user.id, id.data);

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}
