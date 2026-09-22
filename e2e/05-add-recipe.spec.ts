import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./fixtures/auth";
import { countRows, createIngredient, resetData } from "./fixtures/db";

/**
 * 導線5 レシピを増やす（サイトマップ4章）。
 * R-1 → FAB → R-3 → 保存 → R-2。
 */
test.use({ storageState: AUTH_STATE });

test.beforeAll(async () => {
  await resetData();
  await createIngredient("E2Eじゃがいも", "個");
});

test.afterAll(async () => {
  await resetData();
});

test("レシピを登録すると詳細へ移り、一覧にも出る", async ({ page }) => {
  await page.goto("/recipes");
  await page.getByRole("link", { name: "レシピを新規作成" }).click();

  await expect(page).toHaveURL(/\/recipes\/new/);

  await page.getByLabel("料理名").fill("E2E肉じゃが");

  // 材料は1件以上が必須（F3-2）。既存の食材を検索して選ぶ
  await page.getByLabel("食材名で検索").fill("E2Eじゃがいも");
  await page.getByRole("button", { name: /^E2Eじゃがいも/ }).click();
  await page.getByLabel("数量").fill("3");

  await page.getByRole("button", { name: "レシピを保存" }).click();

  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "E2E肉じゃが" })).toBeVisible();
  expect(await countRows("recipes")).toBe(1);

  await page.goto("/recipes");
  await expect(page.getByText("E2E肉じゃが")).toBeVisible();
});
