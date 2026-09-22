/**
 * 食材マスタのクエリ（F2-1, F2-2, F2-3）。
 *
 * ownerId は必ず条件に含める。クライアントから渡された値は使わず、
 * 呼び出し側がセッションから取得したものだけを受け取る（docs/design/system.md 9.2）。
 * 入力検証とエラーメッセージの生成は行わない（docs/design/structure.md 3章）。
 */
import "server-only";
import { and, asc, count, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { ingredients, inventoryItems, recipeIngredients, recipes } from "@/db/schema";
import type { WriteResult } from "@/lib/result";
import { escapeLike, isPgErrorCode } from "@/lib/sql";
import type { Ingredient, IngredientInput, IngredientUsage, UUID } from "@/types";

/** 一意制約違反（ingredients_owner_name_key）。同名食材の重複（F2-3） */
const UNIQUE_VIOLATION = "23505";
/** 外部キー違反。ON DELETE RESTRICT による削除拒否（docs/design/database.md 4章） */
const FOREIGN_KEY_VIOLATION = "23503";

const COLUMNS = {
  id: ingredients.id,
  ownerId: ingredients.ownerId,
  name: ingredients.name,
  defaultUnit: ingredients.defaultUnit,
  isStaple: ingredients.isStaple,
  createdAt: ingredients.createdAt,
};

/** C-2 食材一覧。名称の部分一致と常備食材での絞り込みに対応する */
export async function listIngredients(
  ownerId: UUID,
  options: { query?: string; stapleOnly?: boolean } = {},
): Promise<Ingredient[]> {
  const { query = "", stapleOnly = false } = options;

  return db
    .select(COLUMNS)
    .from(ingredients)
    .where(
      and(
        eq(ingredients.ownerId, ownerId),
        query ? ilike(ingredients.name, `%${escapeLike(query)}%`) : undefined,
        stapleOnly ? eq(ingredients.isStaple, true) : undefined,
      ),
    )
    .orderBy(asc(ingredients.name));
}

/** GET /api/ingredients/search。入力中に逐次呼ぶため件数を絞る（F2-2） */
export async function searchIngredientsByName(
  ownerId: UUID,
  query: string,
  limit = 10,
): Promise<Ingredient[]> {
  if (!query) return [];

  return db
    .select(COLUMNS)
    .from(ingredients)
    .where(and(eq(ingredients.ownerId, ownerId), ilike(ingredients.name, `%${escapeLike(query)}%`)))
    .orderBy(asc(ingredients.name))
    .limit(limit);
}

export async function findIngredientById(ownerId: UUID, id: UUID): Promise<Ingredient | null> {
  const [row] = await db
    .select(COLUMNS)
    .from(ingredients)
    .where(and(eq(ingredients.ownerId, ownerId), eq(ingredients.id, id)))
    .limit(1);

  return row ?? null;
}

/**
 * 指定した ID のうち、自分が持っている食材だけを返す。
 * レシピ材料の保存前に、他オーナーの食材を混ぜられていないか確かめる（F1-2）。
 */
export async function findIngredientsByIds(ownerId: UUID, ids: UUID[]): Promise<Ingredient[]> {
  if (ids.length === 0) return [];

  return db
    .select(COLUMNS)
    .from(ingredients)
    .where(and(eq(ingredients.ownerId, ownerId), inArray(ingredients.id, ids)));
}

/** 同名食材。重複作成を未然に防ぐため候補として提示する（F2-3） */
export async function findIngredientByName(
  ownerId: UUID,
  name: string,
): Promise<Ingredient | null> {
  const [row] = await db
    .select(COLUMNS)
    .from(ingredients)
    .where(and(eq(ingredients.ownerId, ownerId), eq(ingredients.name, name)))
    .limit(1);

  return row ?? null;
}

/**
 * 食材を参照している件数（docs/design/database.md 4章）。
 * レシピ材料は (recipe_id, ingredient_id) が一意なので、行数がレシピ件数と一致する。
 */
export async function findIngredientUsage(ownerId: UUID, id: UUID): Promise<IngredientUsage> {
  const [usedInRecipes, usedInInventory] = await Promise.all([
    db
      .select({ value: count() })
      .from(recipeIngredients)
      .innerJoin(recipes, eq(recipes.id, recipeIngredients.recipeId))
      .where(and(eq(recipeIngredients.ingredientId, id), eq(recipes.ownerId, ownerId))),
    db
      .select({ value: count() })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.ingredientId, id), eq(inventoryItems.ownerId, ownerId))),
  ]);

  return {
    recipes: usedInRecipes[0]?.value ?? 0,
    inventoryItems: usedInInventory[0]?.value ?? 0,
  };
}

export async function insertIngredient(
  ownerId: UUID,
  input: IngredientInput,
): Promise<WriteResult<Ingredient>> {
  try {
    const [row] = await db
      .insert(ingredients)
      .values({ ownerId, ...input })
      .returning(COLUMNS);

    return { ok: true, data: row };
  } catch (error) {
    if (isPgErrorCode(error, UNIQUE_VIOLATION)) return { ok: false, reason: "CONFLICT" };
    throw error;
  }
}

export async function updateIngredient(
  ownerId: UUID,
  id: UUID,
  input: IngredientInput,
): Promise<WriteResult<Ingredient>> {
  try {
    const [row] = await db
      .update(ingredients)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(ingredients.ownerId, ownerId), eq(ingredients.id, id)))
      .returning(COLUMNS);

    return row ? { ok: true, data: row } : { ok: false, reason: "NOT_FOUND" };
  } catch (error) {
    if (isPgErrorCode(error, UNIQUE_VIOLATION)) return { ok: false, reason: "CONFLICT" };
    throw error;
  }
}

/**
 * 参照されている食材は削除できない（ON DELETE RESTRICT）。
 * 既に削除済みの場合は成功として返す（docs/design/system.md 8.2 方針5）。
 */
export async function deleteIngredient(ownerId: UUID, id: UUID): Promise<WriteResult<null>> {
  try {
    await db
      .delete(ingredients)
      .where(and(eq(ingredients.ownerId, ownerId), eq(ingredients.id, id)));

    return { ok: true, data: null };
  } catch (error) {
    if (isPgErrorCode(error, FOREIGN_KEY_VIOLATION)) return { ok: false, reason: "IN_USE" };
    throw error;
  }
}
