/**
 * 在庫と材料の突き合わせ（F6-1, F6-3〜F6-6, F5-5）。
 *
 * 出典: docs/design/system.md 5.2 手順1〜3
 * R-2 の在庫表示と S-1 の提案で同じ関数を使う。フレームワークにも DB にも
 * 依存しない純関数として置き、配列を組み立てて単体テストする（NFR-13）。
 */
import { fromBaseUnit, toBaseUnit } from "../unit/convert";
import { dimensionOf } from "../unit/units";
import type { RecipeIngredient, UUID } from "../../types";
import type { IngredientMatch, MatchableIngredient, StockLot, StockTotals } from "./types";

/**
 * 手順1・手順2。有効な在庫だけを食材ごと・次元ごとに合計する。
 *
 * 有効な在庫は「数量が0より大きい」かつ「期限が null または今日以降」（F5-5）。
 * 同一食材の複数ロットは合計して判定する（F6-5）。
 */
export function aggregateStock(lots: StockLot[], today: string): StockTotals {
  const totals: StockTotals = new Map();

  for (const lot of lots) {
    if (lot.quantity <= 0) continue;
    if (lot.expiresAt !== null && lot.expiresAt < today) continue;

    const byDimension = totals.get(lot.ingredientId) ?? new Map();
    const dimension = dimensionOf(lot.unit);
    byDimension.set(
      dimension,
      (byDimension.get(dimension) ?? 0) + toBaseUnit(lot.quantity, lot.unit),
    );
    totals.set(lot.ingredientId, byDimension);
  }

  return totals;
}

/**
 * 手順3。材料ごとに充足状態を判定する。
 *
 * 単位の次元が違う在庫は数量を比較できないため、在庫があることだけを
 * 伝えて数量は断定しない（F6-6）。
 */
export function matchIngredients(
  required: RecipeIngredient[],
  ingredients: Map<UUID, MatchableIngredient>,
  stock: StockTotals,
): IngredientMatch[] {
  return required.map((row): IngredientMatch => {
    const ingredient = ingredients.get(row.ingredientId);
    const base = {
      ingredientId: row.ingredientId,
      ingredientName: ingredient?.name ?? "",
      required: { quantity: row.quantity, unit: row.unit },
    };

    // 常備食材は判定しない（F6-4）
    if (ingredient?.isStaple) return { ...base, state: "staple", shortage: null };

    const byDimension = stock.get(row.ingredientId);
    const dimension = dimensionOf(row.unit);
    const comparable = byDimension?.get(dimension) ?? 0;
    const hasOtherDimension = [...(byDimension?.keys() ?? [])].some((key) => key !== dimension);

    if (comparable === 0 && !hasOtherDimension) {
      // 在庫なし。不足は必要量の全量
      return { ...base, state: "missing", shortage: { ...base.required } };
    }

    const requiredBase = toBaseUnit(row.quantity, row.unit);
    if (comparable >= requiredBase) return { ...base, state: "satisfied", shortage: null };

    // 換算できない在庫が残っている場合は数量を断定しない（F6-6）
    if (hasOtherDimension) return { ...base, state: "unknown", shortage: null };

    return {
      ...base,
      state: "missing",
      shortage: { quantity: fromBaseUnit(requiredBase - comparable, row.unit), unit: row.unit },
    };
  });
}
