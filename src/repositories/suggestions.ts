/**
 * 提案用のデータ取得とドメイン層の呼び出し（F6-1〜F6-7, F5-4, F5-5）。
 *
 * 出典: docs/design/structure.md 4章、docs/design/system.md 6章 方針2
 * クエリは「レシピ＋材料」と「在庫」の2本だけ。レシピごとに問い合わせない。
 * 算出はサーバー側で行い、画面へは提案の配列だけを返す（NFR-3）。
 */
import "server-only";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { ingredients, inventoryItems, recipeIngredients, recipes } from "@/db/schema";
import { describeExpiry } from "@/domain/expiry/expiry";
import {
  suggest,
  type MatchableIngredient,
  type RecipeSuggestion,
  type StockLot,
  type SuggestableRecipe,
} from "@/domain/suggestion";
import type { DateOnly, UUID } from "@/types";

/** 「いま使いたい食材」に出す件数（画面設計書 S-1 の期限バンド3件） */
const EXPIRING_LIMIT = 3;

/** S-1 の「いま使いたい食材」1件分 */
export interface ExpiringIngredient {
  ingredientId: UUID;
  name: string;
  quantity: number;
  unit: string;
  expiresAt: DateOnly | null;
}

export interface SuggestionView {
  suggestions: RecipeSuggestion[];
  expiring: ExpiringIngredient[];
  /** レシピ0件と在庫0件で案内を出し分ける（F6-7） */
  hasRecipes: boolean;
  hasStock: boolean;
}

/**
 * 在庫から作れるレシピを、不足の少ない順に返す。
 *
 * `use` に食材IDを渡すと、その食材をすべて使うレシピだけに絞る
 * （S-1 の「いま使いたい食材」の選択）。
 */
export async function getSuggestions(
  ownerId: UUID,
  today: DateOnly,
  use: UUID[] = [],
): Promise<SuggestionView> {
  const [recipeRows, lots] = await Promise.all([
    findRecipesWithIngredients(ownerId),
    findStock(ownerId),
  ]);

  const masters = new Map<UUID, MatchableIngredient>();
  const byRecipe = new Map<UUID, SuggestableRecipe>();

  for (const row of recipeRows) {
    masters.set(row.ingredientId, { name: row.ingredientName, isStaple: row.isStaple });

    const recipe = byRecipe.get(row.recipeId) ?? {
      id: row.recipeId,
      name: row.recipeName,
      ingredients: [],
    };
    recipe.ingredients.push({
      ingredientId: row.ingredientId,
      quantity: Number(row.quantity),
      unit: row.unit,
    });
    byRecipe.set(row.recipeId, recipe);
  }

  // レシピで使われていない食材も在庫側から名前を拾っておく
  for (const lot of lots) {
    if (!masters.has(lot.ingredientId)) {
      masters.set(lot.ingredientId, { name: lot.name, isStaple: lot.isStaple });
    }
  }

  const stock: StockLot[] = lots.map((lot) => ({
    ingredientId: lot.ingredientId,
    quantity: lot.quantity,
    unit: lot.unit,
    expiresAt: lot.expiresAt,
  }));

  const all = suggest([...byRecipe.values()], stock, masters, today);

  return {
    suggestions: use.length === 0 ? all : all.filter((row) => usesAll(row, use)),
    expiring: pickExpiring(lots, today),
    hasRecipes: byRecipe.size > 0,
    hasStock: stock.some((lot) => lot.quantity > 0),
  };
}

/** 選んだ食材をすべて使うレシピか。常備食材も材料として数える */
function usesAll(suggestion: RecipeSuggestion, use: UUID[]): boolean {
  const used = new Set(suggestion.matches.map((match) => match.ingredientId));
  return use.every((id) => used.has(id));
}

/**
 * 期限の近い在庫から「いま使いたい食材」を選ぶ（F5-2, F5-4）。
 *
 * 期限切れと数量0は提案の対象外なので出さない（F5-5, F5-3）。
 * 同じ食材が複数ロットある場合は最も近い期限のものにまとめる。
 */
function pickExpiring(lots: StockRow[], today: DateOnly): ExpiringIngredient[] {
  const byIngredient = new Map<UUID, StockRow>();

  for (const lot of lots) {
    if (lot.quantity <= 0) continue;
    if (describeExpiry(lot.expiresAt, today).level === "expired") continue;

    const current = byIngredient.get(lot.ingredientId);
    if (!current || isEarlier(lot.expiresAt, current.expiresAt)) {
      byIngredient.set(lot.ingredientId, lot);
    }
  }

  return [...byIngredient.values()]
    .sort((a, b) => (isEarlier(a.expiresAt, b.expiresAt) ? -1 : 1))
    .slice(0, EXPIRING_LIMIT)
    .map((lot) => ({
      ingredientId: lot.ingredientId,
      name: lot.name,
      quantity: lot.quantity,
      unit: lot.unit,
      expiresAt: lot.expiresAt,
    }));
}

/** 期限なしは「最も遠い」として末尾へ回す */
function isEarlier(a: DateOnly | null, b: DateOnly | null): boolean {
  if (a === null) return false;
  if (b === null) return true;
  return a < b;
}

/** レシピと材料を1クエリで引く。材料0件のレシピは提案の対象にならない（F3-2 で1件以上必須） */
async function findRecipesWithIngredients(ownerId: UUID) {
  return db
    .select({
      recipeId: recipes.id,
      recipeName: recipes.name,
      ingredientId: recipeIngredients.ingredientId,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
      ingredientName: ingredients.name,
      isStaple: ingredients.isStaple,
    })
    .from(recipes)
    .innerJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
    .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
    .where(eq(recipes.ownerId, ownerId))
    .orderBy(asc(recipes.name));
}

type StockRow = {
  ingredientId: UUID;
  name: string;
  isStaple: boolean;
  quantity: number;
  unit: StockLot["unit"];
  expiresAt: DateOnly | null;
};

/**
 * 在庫を1クエリで引く。期限切れの除外はドメイン層が行うため、ここでは
 * 数量0（使い切り / F5-3）だけを落とす。
 */
async function findStock(ownerId: UUID): Promise<StockRow[]> {
  const rows = await db
    .select({
      ingredientId: inventoryItems.ingredientId,
      name: ingredients.name,
      isStaple: ingredients.isStaple,
      quantity: inventoryItems.quantity,
      unit: inventoryItems.unit,
      expiresAt: inventoryItems.expiresAt,
    })
    .from(inventoryItems)
    .innerJoin(ingredients, eq(ingredients.id, inventoryItems.ingredientId))
    .where(and(eq(inventoryItems.ownerId, ownerId), gt(inventoryItems.quantity, "0")))
    .orderBy(asc(inventoryItems.expiresAt));

  return rows.map((row) => ({ ...row, quantity: Number(row.quantity) }));
}
