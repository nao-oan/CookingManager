import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./fixtures/auth";
import { countRows, createIngredient, createRecipe, resetData } from "./fixtures/db";

/**
 * 導線3 作ったものを記録する（サイトマップ4章）。
 * R-2 →「食べた記録をつける」→ M-3 → 保存 → R-2 へ戻る。
 *
 * 記録タブを経由させずに済むことが要（NFR-9 の3タップ）。
 */
test.use({ storageState: AUTH_STATE });

let recipeId: string;

test.beforeAll(async () => {
  await resetData();
  const egg = await createIngredient("E2E卵", "個");
  recipeId = await createRecipe("E2Eだし巻き卵", [{ id: egg, quantity: 3, unit: "個" }]);
});

test.afterAll(async () => {
  await resetData();
});

test("レシピ詳細から食べた記録をつけられる", async ({ page }) => {
  await page.goto(`/recipes/${recipeId}`);

  await page.getByRole("link", { name: "食べた記録をつける" }).click();

  // 当日・直近の食事区分が既定で選ばれ、レシピが品目に入っている
  await expect(page).toHaveURL(/\/meals\/\d{4}-\d{2}-\d{2}\/(breakfast|lunch|dinner|snack)\/edit/);
  await expect(page.getByText("E2Eだし巻き卵")).toBeVisible();

  await page.getByRole("button", { name: /の記録を保存/ }).click();

  // R-2 から来た場合は R-2 へ戻す（画面設計 M-3）
  await expect(page).toHaveURL(new RegExp(`/recipes/${recipeId}$`));
  expect(await countRows("meals")).toBe(1);
});
