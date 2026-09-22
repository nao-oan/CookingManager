import { describe, expect, it } from "vitest";
import { suggest } from "./suggest";
// eslint-disable-next-line import/no-restricted-paths -- 性能試験はシード生成関数を共用する（structure.md 6章 方針4）。suggest 本体は db を参照しない
import { generateSeed } from "../../db/seed";
import type { MatchableIngredient } from "./types";

/**
 * 想定データ量（レシピ200件・在庫100件）での算出時間を測る（NFR-2）。
 *
 * 1秒を超えたら失敗させ、CI で気づけるようにする（docs/design/system.md 6章 方針6）。
 * 入力は src/db/seed.ts の生成関数で作る。種を固定しているので失敗しても同じ入力で再現できる。
 */

const TODAY = "2026-04-01";
const TIME_LIMIT_MS = 1000;

describe("suggest の性能（NFR-2）", () => {
  it("レシピ200件・在庫100件の算出が1秒以内に終わる", () => {
    const seed = generateSeed({ recipeCount: 200, inventoryCount: 100, today: TODAY });
    const masters = new Map<string, MatchableIngredient>(
      seed.ingredients.map((ingredient) => [
        ingredient.id,
        { name: ingredient.name, isStaple: ingredient.isStaple },
      ]),
    );

    // 生成時間は計らない。測るのは算出だけ
    const startedAt = performance.now();
    const suggestions = suggest(seed.recipes, seed.inventory, masters, TODAY);
    const elapsedMs = performance.now() - startedAt;

    expect(suggestions).toHaveLength(200);
    expect(elapsedMs).toBeLessThan(TIME_LIMIT_MS);
  });

  it("シードは種が同じなら同じデータになる（失敗を再現できること）", () => {
    const a = generateSeed({ recipeCount: 10, inventoryCount: 10, today: TODAY });
    const b = generateSeed({ recipeCount: 10, inventoryCount: 10, today: TODAY });
    expect(a).toEqual(b);
  });
});
