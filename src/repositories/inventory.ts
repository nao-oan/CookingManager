/**
 * 在庫のクエリ（F5-1）。
 *
 * ownerId は必ず条件に含める（docs/design/system.md 9.2）。
 * レシピ・提案向けの取得では期限切れや数量0を絞り込まない。除外の判定は
 * ドメイン層（aggregateStock）に任せ、条件を2箇所に持たせないため。
 * P-1 の一覧だけは既定表示の規則（F5-3）としてここで数量0を外す。
 */
import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ingredients, inventoryItems } from "@/db/schema";
import type { WriteResult } from "@/lib/result";
import type { InventoryInput, InventoryItem, InventoryListItem, UUID } from "@/types";

const COLUMNS = {
  id: inventoryItems.id,
  ownerId: inventoryItems.ownerId,
  ingredientId: inventoryItems.ingredientId,
  quantity: inventoryItems.quantity,
  unit: inventoryItems.unit,
  expiresAt: inventoryItems.expiresAt,
};

/** R-2 の在庫表示用。レシピの材料に関わる在庫だけを1クエリで引く */
export async function findInventoryByIngredientIds(
  ownerId: UUID,
  ingredientIds: UUID[],
): Promise<InventoryItem[]> {
  if (ingredientIds.length === 0) return [];

  const rows = await db
    .select(COLUMNS)
    .from(inventoryItems)
    .where(
      and(eq(inventoryItems.ownerId, ownerId), inArray(inventoryItems.ingredientId, ingredientIds)),
    );

  return rows.map((row) => ({
    ...row,
    // numeric は文字列で返るため数値に戻す（docs/design/database.md 1章 方針6）
    quantity: Number(row.quantity),
  }));
}

/**
 * P-1 在庫一覧。賞味期限の近い順に並べる（F5-2, F5-4）。
 *
 * 期限なしの行は末尾に置く（NULLS LAST）。期限が同じ行は食材名で安定させる。
 * 数量0の在庫は行を残したまま既定表示から外す（F5-3）。
 */
export async function listInventory(
  ownerId: UUID,
  options: { includeEmpty?: boolean } = {},
): Promise<InventoryListItem[]> {
  const { includeEmpty = false } = options;

  const rows = await db
    .select({ ...COLUMNS, ingredientName: ingredients.name })
    .from(inventoryItems)
    .innerJoin(ingredients, eq(ingredients.id, inventoryItems.ingredientId))
    .where(
      and(
        eq(inventoryItems.ownerId, ownerId),
        includeEmpty ? undefined : sql`${inventoryItems.quantity} > 0`,
      ),
    )
    .orderBy(sql`${inventoryItems.expiresAt} asc nulls last`, asc(ingredients.name));

  return rows.map(toListItem);
}

/** P-3 在庫編集。食材名も要るため一覧と同じ結合で1件取る */
export async function findInventoryItemById(
  ownerId: UUID,
  id: UUID,
): Promise<InventoryListItem | null> {
  const [row] = await db
    .select({ ...COLUMNS, ingredientName: ingredients.name })
    .from(inventoryItems)
    .innerJoin(ingredients, eq(ingredients.id, inventoryItems.ingredientId))
    .where(and(eq(inventoryItems.ownerId, ownerId), eq(inventoryItems.id, id)))
    .limit(1);

  return row ? toListItem(row) : null;
}

export async function insertInventory(
  ownerId: UUID,
  input: InventoryInput,
): Promise<InventoryItem> {
  const [row] = await db
    .insert(inventoryItems)
    .values({ ownerId, ...input, quantity: toNumeric(input.quantity) })
    .returning(COLUMNS);

  return toItem(row);
}

export async function updateInventory(
  ownerId: UUID,
  id: UUID,
  input: InventoryInput,
): Promise<WriteResult<InventoryItem>> {
  const [row] = await db
    .update(inventoryItems)
    .set({ ...input, quantity: toNumeric(input.quantity), updatedAt: new Date() })
    .where(and(eq(inventoryItems.ownerId, ownerId), eq(inventoryItems.id, id)))
    .returning(COLUMNS);

  return row ? { ok: true, data: toItem(row) } : { ok: false, reason: "NOT_FOUND" };
}

/**
 * 数量を差分で増減する（F5-3）。
 *
 * 絶対値で上書きすると、ステッパーを連打したときに古い値で書き戻してしまう。
 * 加算は DB 側で行い、0 を下回らないよう GREATEST で止める
 * （docs/design/system.md 8.2 方針4）。CHECK (quantity >= 0) への違反も同時に防げる。
 * 上限は numeric(10,2) の桁あふれを避けるため LEAST で抑える。
 */
export async function addInventoryQuantity(
  ownerId: UUID,
  id: UUID,
  delta: number,
): Promise<WriteResult<InventoryItem>> {
  const [row] = await db
    .update(inventoryItems)
    .set({
      quantity: sql`least(greatest(${inventoryItems.quantity} + ${toNumeric(delta)}::numeric, 0), 99999999.99)`,
      updatedAt: new Date(),
    })
    .where(and(eq(inventoryItems.ownerId, ownerId), eq(inventoryItems.id, id)))
    .returning(COLUMNS);

  return row ? { ok: true, data: toItem(row) } : { ok: false, reason: "NOT_FOUND" };
}

/**
 * 在庫を削除する。履歴性を持たないため物理削除する（docs/design/database.md 4章）。
 * 削除済みでも成功として返す（docs/design/system.md 8.2 方針5）。
 */
export async function deleteInventory(ownerId: UUID, id: UUID): Promise<void> {
  await db
    .delete(inventoryItems)
    .where(and(eq(inventoryItems.ownerId, ownerId), eq(inventoryItems.id, id)));
}

/** COLUMNS の選択結果。numeric は文字列で返る（docs/design/database.md 1章 方針6） */
type InventoryRow = Omit<InventoryItem, "quantity"> & { quantity: string };

function toItem(row: InventoryRow): InventoryItem {
  return { ...row, quantity: Number(row.quantity) };
}

function toListItem(row: InventoryRow & { ingredientName: string }): InventoryListItem {
  return { ...row, quantity: Number(row.quantity) };
}

/** numeric への書き込みは文字列で渡す（docs/design/database.md 1章 方針6） */
function toNumeric(quantity: number): string {
  return quantity.toFixed(2);
}
