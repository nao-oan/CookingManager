"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import { deleteMeal as deleteMealRow, saveMeal as saveMealRow } from "@/repositories/meals";
import { findRecipesByIds } from "@/repositories/recipes";
import type { MealItemInput, UUID } from "@/types";
import { mealDeleteSchema, mealSaveSchema, type MealFormInput } from "@/validations/meal";

/**
 * 食事記録の Server Action（F4-1〜F4-3）。
 * 出典: docs/design/system.md 7.2
 *
 * 品目は件数が可変なので、FormData ではなく構造化した値を受け取る。
 * 画面から届く値は信用せず、Zod で検証し直す（docs/design/system.md 8.2 方針2）。
 * 保存・削除の後は画面を移すため、成功時の戻り値を持たない。
 */

export type MealState = ActionResult<never> | null;

const LIST_PATH = "/meals";

function invalid(issues: readonly { path: PropertyKey[]; message: string }[]): ActionResult<never> {
  return fail("VALIDATION_ERROR", "入力内容を確認してください", toFieldErrors(issues));
}

/** 保存の前後で変わる画面をまとめて作り直す */
function revalidateMeal(date: string, slot: string): void {
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${date}`);
  revalidatePath(`${LIST_PATH}/${date}/${slot}/edit`);
}

/**
 * レシピ参照の品目を検証し、表示名を確定する。
 *
 * 外部キーは存在しか見ないため、他オーナーのレシピ ID を混ぜられないよう
 * 自分のレシピだけを引いて件数を照合する（F1-2）。
 * display_name には画面から来た文字列ではなく、保存時点の料理名を複写する
 * （docs/design/database.md 4章）。
 */
async function resolveItems(
  ownerId: UUID,
  items: MealItemInput[],
): Promise<ActionResult<MealItemInput[]>> {
  const ids = [...new Set(items.map((item) => item.recipeId).filter((id) => id !== null))];
  const owned = await findRecipesByIds(ownerId, ids);

  if (owned.length !== ids.length) {
    return fail("FORBIDDEN", "操作できません", {
      items: "選べないレシピが含まれています。品目を選び直してください",
    });
  }

  const names = new Map(owned.map((recipe) => [recipe.id, recipe.name]));

  return ok(
    items.map((item) => ({
      recipeId: item.recipeId,
      displayName:
        item.recipeId === null ? item.displayName : (names.get(item.recipeId) ?? item.displayName),
    })),
  );
}

export async function saveMeal(_prev: MealState, input: MealFormInput): Promise<MealState> {
  const user = await requireUser();
  const parsed = mealSaveSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { date, slot, note, fromRecipeId } = parsed.data;

  const items = await resolveItems(user.id, parsed.data.items);
  if (!items.ok) return items;

  await saveMealRow(user.id, date, slot, { items: items.data, note });

  revalidateMeal(date, slot);
  // R-2 から来た記録は R-2 へ戻す（画面設計 M-3 の遷移 / NFR-9）
  if (fromRecipeId) redirect(`/recipes/${fromRecipeId}`);
  redirect(`${LIST_PATH}/${date}`);
}

export async function deleteMeal(_prev: MealState, formData: FormData): Promise<MealState> {
  const user = await requireUser();
  const parsed = mealDeleteSchema.safeParse({
    id: formData.get("id"),
    date: formData.get("date"),
    slot: formData.get("slot"),
  });
  if (!parsed.success) return fail("NOT_FOUND", "記録が見つかりません");

  await deleteMealRow(user.id, parsed.data.id);

  revalidateMeal(parsed.data.date, parsed.data.slot);
  redirect(`${LIST_PATH}/${parsed.data.date}`);
}
