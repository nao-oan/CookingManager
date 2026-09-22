import { describe, expect, it } from "vitest";
import { suggest } from "./suggest";
import type { MatchableIngredient, StockLot, SuggestableRecipe } from "./types";
import type { RecipeIngredient, Unit } from "../../types";

/**
 * docs/design/system.md 5.4 の条件1〜10 を suggest() 経由で押さえる（NFR-13）。
 * 判定単体の網羅は match.test.ts にあり、ここでは集計（手順4）と並べ替え（手順5）が
 * 絡んだときの振る舞いを確認する。
 */

const TODAY = "2026-09-22";
const CHICKEN = "11111111-1111-1111-1111-111111111111";
const EGG = "22222222-2222-2222-2222-222222222222";
const SALT = "33333333-3333-3333-3333-333333333333";
const MILK = "44444444-4444-4444-4444-444444444444";

const masters = new Map<string, MatchableIngredient>([
  [CHICKEN, { name: "鶏もも肉", isStaple: false }],
  [EGG, { name: "卵", isStaple: false }],
  [SALT, { name: "塩", isStaple: true }],
  [MILK, { name: "牛乳", isStaple: false }],
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

function recipe(id: string, name: string, ingredients: RecipeIngredient[]): SuggestableRecipe {
  return { id, name, ingredients };
}

/** レシピ1件だけを渡して、その提案を取り出す */
function suggestOne(ingredients: RecipeIngredient[], lots: StockLot[], today = TODAY) {
  return suggest([recipe("r1", "テスト料理", ingredients)], lots, masters, today)[0];
}

describe("suggest の材料判定（条件1〜8）", () => {
  it("条件1: 在庫が必要量ちょうどなら satisfied", () => {
    const result = suggestOne([need(CHICKEN, 200, "g")], [lot(CHICKEN, 200, "g")]);
    expect(result.matches[0].state).toBe("satisfied");
    expect(result).toMatchObject({ missingCount: 0, satisfiedCount: 1, requiredCount: 1 });
  });

  it("条件2: kg の在庫と g の材料は換算して判定する", () => {
    expect(suggestOne([need(CHICKEN, 200, "g")], [lot(CHICKEN, 0.2, "kg")]).matches[0].state).toBe(
      "satisfied",
    );

    const short = suggestOne([need(CHICKEN, 300, "g")], [lot(CHICKEN, 0.2, "kg")]);
    expect(short.matches[0]).toMatchObject({
      state: "missing",
      shortage: { quantity: 100, unit: "g" },
    });
    expect(short.missingCount).toBe(1);
  });

  it("条件3: 同一食材の複数ロットは合計で判定する（F6-5）", () => {
    const result = suggestOne(
      [need(CHICKEN, 500, "g")],
      [lot(CHICKEN, 300, "g"), lot(CHICKEN, 0.2, "kg")],
    );
    expect(result.matches[0].state).toBe("satisfied");
  });

  it("条件4: 個 の在庫に対し g の材料は unknown（F6-6）", () => {
    const result = suggestOne([need(EGG, 100, "g")], [lot(EGG, 2, "個")]);
    expect(result.matches[0].state).toBe("unknown");
    expect(result).toMatchObject({ unknownCount: 1, missingCount: 0, satisfiedCount: 0 });
  });

  it("条件5: 在庫なしは missing で、不足は必要量の全量", () => {
    const result = suggestOne([need(CHICKEN, 200, "g")], []);
    expect(result.matches[0]).toMatchObject({
      state: "missing",
      shortage: { quantity: 200, unit: "g" },
    });
  });

  it("条件6: 常備食材は staple で、分母に数えない（F6-4）", () => {
    const result = suggestOne(
      [need(CHICKEN, 200, "g"), need(SALT, 5, "g")],
      [lot(CHICKEN, 200, "g")],
    );
    expect(result.matches[1].state).toBe("staple");
    // 材料は2件だが、分母は常備食材を除いた1件
    expect(result).toMatchObject({ requiredCount: 1, satisfiedCount: 1, missingCount: 0 });
  });

  it("条件7: 期限切れの在庫だけなら missing（F5-5）", () => {
    const result = suggestOne([need(CHICKEN, 200, "g")], [lot(CHICKEN, 300, "g", "2026-09-21")]);
    expect(result.matches[0].state).toBe("missing");
  });

  it("条件8: 期限が null の在庫は有効として扱う", () => {
    const result = suggestOne([need(CHICKEN, 200, "g")], [lot(CHICKEN, 300, "g", null)]);
    expect(result.matches[0].state).toBe("satisfied");
  });
});

describe("suggest の並べ替え（条件9）", () => {
  it("第1キーは不足数の昇順（F6-2）", () => {
    const recipes = [
      recipe("r1", "あ不足2", [need(CHICKEN, 100, "g"), need(EGG, 1, "個")]),
      recipe("r2", "い不足0", [need(MILK, 100, "ml")]),
    ];

    const result = suggest(recipes, [lot(MILK, 200, "ml")], masters, TODAY);
    expect(result.map((row) => row.recipeId)).toEqual(["r2", "r1"]);
  });

  it("不足数が同じなら unknown の少ない側が上位（第2キー）", () => {
    const recipes = [
      recipe("r1", "あ数量不明", [need(EGG, 100, "g")]),
      recipe("r2", "い充足", [need(MILK, 100, "ml")]),
    ];

    const result = suggest(recipes, [lot(EGG, 2, "個"), lot(MILK, 200, "ml")], masters, TODAY);
    expect(result.map((row) => row.recipeId)).toEqual(["r2", "r1"]);
  });

  it("条件9: 不足数が同じレシピ2件は、期限の近い在庫を使う側が上位（第3キー）", () => {
    // レシピ名だけなら「あ」が先に来るので、期限で順序が入れ替わることを確認する
    const recipes = [
      recipe("r1", "あ鶏の料理", [need(CHICKEN, 100, "g")]),
      recipe("r2", "い牛乳の料理", [need(MILK, 100, "ml")]),
    ];
    const lots = [lot(CHICKEN, 200, "g", "2026-12-31"), lot(MILK, 200, "ml", "2026-09-25")];

    const result = suggest(recipes, lots, masters, TODAY);
    expect(result.map((row) => row.recipeId)).toEqual(["r2", "r1"]);
  });

  it("期限付きの在庫を使わないレシピは、期限付きを使うレシピより後ろになる", () => {
    const recipes = [
      recipe("r1", "あ期限なし", [need(CHICKEN, 100, "g")]),
      recipe("r2", "い期限あり", [need(MILK, 100, "ml")]),
    ];
    const lots = [lot(CHICKEN, 200, "g", null), lot(MILK, 200, "ml", "2026-10-01")];

    const result = suggest(recipes, lots, masters, TODAY);
    expect(result.map((row) => row.recipeId)).toEqual(["r2", "r1"]);
  });

  it("常備食材の期限は順序に効かせない（F6-4）", () => {
    // 塩は判定対象外なので、期限が最も近くても r1 を引き上げない
    const recipes = [
      recipe("r1", "あ塩の料理", [need(SALT, 5, "g"), need(CHICKEN, 100, "g")]),
      recipe("r2", "い牛乳の料理", [need(MILK, 100, "ml")]),
    ];
    const lots = [
      lot(SALT, 500, "g", "2026-09-23"),
      lot(CHICKEN, 200, "g", "2026-12-31"),
      lot(MILK, 200, "ml", "2026-09-25"),
    ];

    const result = suggest(recipes, lots, masters, TODAY);
    expect(result.map((row) => row.recipeId)).toEqual(["r2", "r1"]);
  });

  it("すべてのキーが同じならレシピ名の昇順で安定させる（第4キー）", () => {
    const recipes = [
      recipe("r1", "とり料理", [need(CHICKEN, 100, "g")]),
      recipe("r2", "あさり料理", [need(CHICKEN, 100, "g")]),
    ];

    const result = suggest(recipes, [lot(CHICKEN, 500, "g")], masters, TODAY);
    expect(result.map((row) => row.recipeName)).toEqual(["あさり料理", "とり料理"]);
  });
});

describe("suggest の境界（条件10）", () => {
  it("条件10: レシピ0件なら空配列を返す（画面側で F6-7 の案内を出す）", () => {
    expect(suggest([], [lot(CHICKEN, 200, "g")], masters, TODAY)).toEqual([]);
  });

  it("条件10: 在庫0件ならすべての材料が不足になる", () => {
    const recipes = [recipe("r1", "鶏と卵", [need(CHICKEN, 100, "g"), need(EGG, 2, "個")])];

    const [result] = suggest(recipes, [], masters, TODAY);
    expect(result).toMatchObject({
      missingCount: 2,
      unknownCount: 0,
      requiredCount: 2,
      satisfiedCount: 0,
    });
    expect(result.matches.every((match) => match.state === "missing")).toBe(true);
  });

  it("在庫がすべて期限切れなら、在庫0件と同じ扱いになる（F5-5）", () => {
    const recipes = [recipe("r1", "鶏料理", [need(CHICKEN, 100, "g")])];

    const [result] = suggest(recipes, [lot(CHICKEN, 500, "g", "2026-09-21")], masters, TODAY);
    expect(result.missingCount).toBe(1);
  });
});

describe("suggest の集計（手順4）", () => {
  it("requiredCount と satisfiedCount は「食材 3/4」の分母と分子になる", () => {
    const ingredients = [
      need(CHICKEN, 100, "g"),
      need(EGG, 2, "個"),
      need(MILK, 100, "ml"),
      need(SALT, 5, "g"),
      need(EGG, 1, "袋"),
    ];
    const lots = [lot(CHICKEN, 500, "g"), lot(EGG, 3, "個"), lot(MILK, 200, "ml")];

    const [result] = suggest([recipe("r1", "盛り合わせ", ingredients)], lots, masters, TODAY);

    // 材料5件のうち塩は常備食材。残り4件のうち、袋の在庫が無い卵だけが判定できない
    expect(result).toMatchObject({
      requiredCount: 4,
      satisfiedCount: 3,
      missingCount: 0,
      unknownCount: 1,
    });
  });

  it("matches はレシピの材料順のまま返す", () => {
    const [result] = suggest(
      [recipe("r1", "鶏と卵", [need(EGG, 1, "個"), need(CHICKEN, 100, "g")])],
      [],
      masters,
      TODAY,
    );
    expect(result.matches.map((match) => match.ingredientName)).toEqual(["卵", "鶏もも肉"]);
  });
});
