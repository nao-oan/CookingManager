/**
 * レシピのクエリ（F3-1, F3-2, F3-3）。
 *
 * ownerId は必ず条件に含める（docs/design/system.md 9.2）。
 * 材料と手順はレシピの一部なので、取得も保存もレシピ単位で扱う。
 */
import "server-only";
import { and, asc, desc, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { ingredients, recipeIngredients, recipes, recipeSteps } from "@/db/schema";
import { aggregateStock, matchIngredients, type IngredientMatch } from "@/domain/suggestion";
import type { WriteResult } from "@/lib/result";
import { escapeLike } from "@/lib/sql";
import type { Recipe, RecipeInput, RecipeSummary, UUID } from "@/types";
import { findInventoryByIngredientIds } from "./inventory";

/** R-1 のカードに出すタグの上限。カード幅に収まる数に絞る */
const TAG_LIMIT = 3;

/**
 * R-1 レシピ一覧。料理名の部分一致で絞り込む（F3-3）。
 * 材料は2クエリ目でまとめて引き、レシピごとの N+1 を避ける。
 */
export async function listRecipes(ownerId: UUID, query = ""): Promise<RecipeSummary[]> {
  const rows = await db
    .select({ id: recipes.id, name: recipes.name })
    .from(recipes)
    .where(
      and(
        eq(recipes.ownerId, ownerId),
        query ? ilike(recipes.name, `%${escapeLike(query)}%`) : undefined,
      ),
    )
    // 登録が新しいものから並べる
    .orderBy(desc(recipes.createdAt));

  if (rows.length === 0) return [];

  const members = await db
    .select({ recipeId: recipeIngredients.recipeId, name: ingredients.name })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
    .where(
      inArray(
        recipeIngredients.recipeId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(ingredients.name));

  const namesByRecipe = new Map<UUID, string[]>();
  for (const member of members) {
    const names = namesByRecipe.get(member.recipeId) ?? [];
    names.push(member.name);
    namesByRecipe.set(member.recipeId, names);
  }

  return rows.map((row) => {
    const names = namesByRecipe.get(row.id) ?? [];
    return {
      id: row.id,
      name: row.name,
      ingredientCount: names.length,
      ingredientNames: names.slice(0, TAG_LIMIT),
    };
  });
}

/** R-2・R-4 用。材料と手順を含めて1件取得する */
export async function findRecipeById(ownerId: UUID, id: UUID): Promise<Recipe | null> {
  const [recipe] = await db
    .select({
      id: recipes.id,
      ownerId: recipes.ownerId,
      name: recipes.name,
      note: recipes.note,
    })
    .from(recipes)
    .where(and(eq(recipes.ownerId, ownerId), eq(recipes.id, id)))
    .limit(1);

  if (!recipe) return null;

  const [members, steps] = await Promise.all([
    db
      .select({
        ingredientId: recipeIngredients.ingredientId,
        quantity: recipeIngredients.quantity,
        unit: recipeIngredients.unit,
        name: ingredients.name,
        isStaple: ingredients.isStaple,
      })
      .from(recipeIngredients)
      .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
      .where(eq(recipeIngredients.recipeId, recipe.id))
      .orderBy(asc(ingredients.name)),
    db
      .select({ body: recipeSteps.body })
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, recipe.id))
      .orderBy(asc(recipeSteps.position)),
  ]);

  return {
    ...recipe,
    ingredients: members.map((member) => ({
      ingredientId: member.ingredientId,
      // numeric は文字列で返るため数値に戻す（docs/design/database.md 1章 方針6）
      quantity: Number(member.quantity),
      unit: member.unit,
      name: member.name,
      isStaple: member.isStaple,
    })),
    steps: steps.map((step) => step.body),
  };
}

/**
 * R-2 用。レシピと、材料ごとの在庫の充足状態を返す（F3-4, F6-4, F6-6）。
 * 出典: docs/design/system.md 7.3
 *
 * 判定は提案アルゴリズムと同じドメイン関数を使う。DB からは行を取るだけで、
 * 期限切れや単位換算の判断はドメイン層に任せる。
 */
export async function getRecipeWithStock(
  ownerId: UUID,
  id: UUID,
  today: string,
): Promise<(Recipe & { matches: IngredientMatch[] }) | null> {
  const recipe = await findRecipeById(ownerId, id);
  if (!recipe) return null;

  const lots = await findInventoryByIngredientIds(
    ownerId,
    recipe.ingredients.map((member) => member.ingredientId),
  );

  const masters = new Map(
    recipe.ingredients.map((member) => [
      member.ingredientId,
      { name: member.name, isStaple: member.isStaple },
    ]),
  );

  return {
    ...recipe,
    matches: matchIngredients(recipe.ingredients, masters, aggregateStock(lots, today)),
  };
}

/** レシピと材料・手順を1トランザクションで作る（docs/design/database.md 5.3） */
export async function insertRecipe(ownerId: UUID, input: RecipeInput): Promise<UUID> {
  return db.transaction(async (tx) => {
    const [recipe] = await tx
      .insert(recipes)
      .values({ ownerId, name: input.name, note: input.note })
      .returning({ id: recipes.id });

    await insertChildren(tx, recipe.id, input);
    return recipe.id;
  });
}

/**
 * レシピを更新する。材料と手順は入れ替えとして扱う。
 *
 * 差分更新にすると position の一意制約と衝突しやすく、
 * 並べ替えのたびに DEFERRABLE 制約へ依存することになる（docs/design/database.md 5.4）。
 * 件数が二桁に収まる規模なので、消してから入れ直すほうが単純で安全。
 */
export async function updateRecipe(
  ownerId: UUID,
  id: UUID,
  input: RecipeInput,
): Promise<WriteResult<UUID>> {
  return db.transaction(async (tx) => {
    const [recipe] = await tx
      .update(recipes)
      .set({ name: input.name, note: input.note, updatedAt: new Date() })
      .where(and(eq(recipes.ownerId, ownerId), eq(recipes.id, id)))
      .returning({ id: recipes.id });

    if (!recipe) return { ok: false, reason: "NOT_FOUND" };

    await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id));
    await tx.delete(recipeSteps).where(eq(recipeSteps.recipeId, recipe.id));
    await insertChildren(tx, recipe.id, input);

    return { ok: true, data: recipe.id };
  });
}

/**
 * レシピを削除する。材料と手順は CASCADE で消え、食事記録は
 * recipe_id が null になって表示名だけ残る（docs/design/database.md 4章）。
 * 削除済みでも成功として返す（docs/design/system.md 8.2 方針5）。
 */
export async function deleteRecipe(ownerId: UUID, id: UUID): Promise<void> {
  await db.delete(recipes).where(and(eq(recipes.ownerId, ownerId), eq(recipes.id, id)));
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertChildren(tx: Tx, recipeId: UUID, input: RecipeInput): Promise<void> {
  await tx.insert(recipeIngredients).values(
    input.ingredients.map((member) => ({
      recipeId,
      ingredientId: member.ingredientId,
      quantity: member.quantity.toFixed(2),
      unit: member.unit,
    })),
  );

  if (input.steps.length > 0) {
    await tx.insert(recipeSteps).values(
      input.steps.map((body, index) => ({
        recipeId,
        // position は1始まり（docs/design/database.md 5.4）
        position: index + 1,
        body,
      })),
    );
  }
}
