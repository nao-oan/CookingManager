import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./fixtures/auth";
import { countRows, createIngredient, resetData } from "./fixtures/db";

/**
 * 導線4 買い物から帰って在庫を入れる（サイトマップ4章）。
 * P-1 → FAB → P-2 → 在庫に追加 → P-1 に出る。
 */
test.use({ storageState: AUTH_STATE });

test.beforeAll(async () => {
  await resetData();
  await createIngredient("E2E牛乳", "ml");
});

test.afterAll(async () => {
  await resetData();
});

test("在庫を追加すると一覧に出る", async ({ page }) => {
  await page.goto("/pantry");
  await page.getByRole("link", { name: "在庫を追加" }).click();

  await expect(page).toHaveURL(/\/pantry\/new/);

  // 既存の食材を検索して選ぶ（F2-2）
  await page.getByLabel("食材名で検索").fill("E2E牛乳");
  await page.getByRole("button", { name: /^E2E牛乳/ }).click();

  await page.getByLabel("数量").fill("500");
  await page.getByRole("button", { name: "在庫に追加" }).click();

  await expect(page).toHaveURL(/\/pantry$/);
  await expect(page.getByText("E2E牛乳")).toBeVisible();
  expect(await countRows("inventory_items")).toBe(1);
});
