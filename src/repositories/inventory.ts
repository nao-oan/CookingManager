/**
 * 在庫のクエリ（F5-1）。
 *
 * ownerId は必ず条件に含める（docs/design/system.md 9.2）。
 * 期限切れや数量0の除外はドメイン層（aggregateStock）が行うため、
 * ここでは行をそのまま返す。判定条件を2箇所に持たせない。
 */
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryItems } from "@/db/schema";
import type { InventoryItem, UUID } from "@/types";

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
