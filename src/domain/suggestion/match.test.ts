import { describe, expect, it } from "vitest";
import { aggregateStock, matchIngredients } from "./match";
import type { MatchableIngredient, StockLot } from "./types";
import type { RecipeIngredient, Unit } from "../../types";

/**
 * docs/design/system.md 5.4 の条件1〜8 を押さえる（NFR-13）。
 * 条件9・10（提案の並べ替えと空配列）は suggest 側の責務で、#29 で足す。
 */

const TODAY = "2026-09-22";
const CHICKEN = "11111111-1111-1111-1111-111111111111";
const EGG = "22222222-2222-2222-2222-222222222222";
const SALT = "33333333-3333-3333-3333-333333333333";

const masters = new Map<string, MatchableIngredient>([
  [CHICKEN, { name: "鶏もも肉", isStaple: false }],
  [EGG, { name: "卵", isStaple: false }],
  [SALT, { name: "塩", isStaple: true }],
]);

function lot(
  ingredientId: string,
  quantity: number,
  unit: Unit,
  expiresAt: string | null = null,
): StockLot {
  return { ingredientId, quantity, unit, expiresAt };
}

function need(ingredientId: string, quantity: number, unit: Unit): RecipeIngredient {
  return { ingredientId, quantity, unit };
}

function judge(required: RecipeIngredient[], lots: StockLot[], today = TODAY) {
  return matchIngredients(required, masters, aggregateStock(lots, today));
}

describe("matchIngredients", () => {
  it("条件1: 在庫が必要量ちょうどなら satisfied", () => {
    const [match] = judge([need(CHICKEN, 200, "g")], [lot(CHICKEN, 200, "g")]);
    expect(match.state).toBe("satisfied");
    expect(match.shortage).toBeNull();
  });

  it("条件2: kg の在庫と g の材料は換算して判定する", () => {
    expect(judge([need(CHICKEN, 200, "g")], [lot(CHICKEN, 0.2, "kg")])[0].state).toBe("satisfied");
    expect(judge([need(CHICKEN, 300, "g")], [lot(CHICKEN, 0.2, "kg")])[0]).toMatchObject({
      state: "missing",
      shortage: { quantity: 100, unit: "g" },
    });
  });

  it("条件3: 同一食材の複数ロットは合計で判定する（F6-5）", () => {
    const [match] = judge(
      [need(CHICKEN, 500, "g")],
      [lot(CHICKEN, 300, "g"), lot(CHICKEN, 0.2, "kg")],
    );
    expect(match.state).toBe("satisfied");
  });

  it("条件4: 個 の在庫に対し g の材料は unknown（F6-6）", () => {
    const [match] = judge([need(EGG, 100, "g")], [lot(EGG, 2, "個")]);
    expect(match.state).toBe("unknown");
    expect(match.shortage).toBeNull();
  });

  it("換算できない在庫と比較できる在庫が混在し、比較分で足りるなら satisfied", () => {
    const [match] = judge([need(EGG, 2, "個")], [lot(EGG, 2, "個"), lot(EGG, 1, "パック")]);
    expect(match.state).toBe("satisfied");
  });

  it("比較できる在庫が足りず、換算できない在庫が残る場合は unknown", () => {
    const [match] = judge([need(EGG, 3, "個")], [lot(EGG, 2, "個"), lot(EGG, 1, "パック")]);
    expect(match.state).toBe("unknown");
  });

  it("条件5: 在庫なしは missing で、不足は必要量の全量", () => {
    const [match] = judge([need(CHICKEN, 200, "g")], []);
    expect(match).toMatchObject({
      state: "missing",
      shortage: { quantity: 200, unit: "g" },
    });
  });

  it("条件6: 常備食材は staple で数量を見ない（F6-4）", () => {
    const [match] = judge([need(SALT, 5, "g")], []);
    expect(match.state).toBe("staple");
    expect(match.shortage).toBeNull();
  });

  it("条件7: 期限切れの在庫だけなら missing（F5-5）", () => {
    const [match] = judge([need(CHICKEN, 200, "g")], [lot(CHICKEN, 300, "g", "2026-09-21")]);
    expect(match.state).toBe("missing");
  });

  it("期限が今日の在庫は有効として扱う（F5-5）", () => {
    const [match] = judge([need(CHICKEN, 200, "g")], [lot(CHICKEN, 300, "g", TODAY)]);
    expect(match.state).toBe("satisfied");
  });

  it("条件8: 期限が null の在庫は有効として扱う", () => {
    const [match] = judge([need(CHICKEN, 200, "g")], [lot(CHICKEN, 300, "g", null)]);
    expect(match.state).toBe("satisfied");
  });

  it("数量0の在庫は使い切りとして無視する（F5-3）", () => {
    const [match] = judge([need(CHICKEN, 200, "g")], [lot(CHICKEN, 0, "g")]);
    expect(match.state).toBe("missing");
  });

  it("材料名と必要量をそのまま返す", () => {
    const [match] = judge([need(CHICKEN, 1.5, "kg")], []);
    expect(match.ingredientName).toBe("鶏もも肉");
    expect(match.required).toEqual({ quantity: 1.5, unit: "kg" });
  });
});

describe("aggregateStock", () => {
  it("食材ごと・次元ごとに基準単位で合計する", () => {
    const totals = aggregateStock(
      [lot(EGG, 2, "個"), lot(EGG, 1, "パック"), lot(EGG, 1, "個")],
      TODAY,
    );
    expect(totals.get(EGG)?.get("count:個")).toBe(3);
    expect(totals.get(EGG)?.get("count:パック")).toBe(1);
  });

  it("質量は g、容量は ml に揃える", () => {
    const totals = aggregateStock([lot(CHICKEN, 1.2, "kg"), lot(CHICKEN, 300, "g")], TODAY);
    expect(totals.get(CHICKEN)?.get("mass")).toBe(1500);
  });

  it("有効な在庫が無い食材は現れない", () => {
    const totals = aggregateStock([lot(CHICKEN, 0, "g"), lot(EGG, 1, "個", "2020-01-01")], TODAY);
    expect(totals.size).toBe(0);
  });
});
