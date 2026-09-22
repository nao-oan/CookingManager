import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./fixtures/auth";
import { createIngredient, createInventory, createRecipe, resetData } from "./fixtures/db";

/**
 * 導線2 今日の献立を決める（サイトマップ4章）。
 * S-1 で不足の少ない順に並んだレシピを見て、R-2 で材料と在庫を確認する。
 */
test.use({ storageState: AUTH_STATE });

test.beforeAll(async () => {
  await resetData();

  const chicken = await createIngredient("E2E鶏もも肉", "g");
  const spinach = await createIngredient("E2Eほうれん草", "袋");

  // 在庫がそろう案と、ほうれん草が足りない案を作る
  await createRecipe(
    "E2E鶏の照り焼き",
    [{ id: chicken, quantity: 200, unit: "g" }],
    ["鶏肉を焼く"],
  );
  await createRecipe("E2E鶏とほうれん草の炒めもの", [
    { id: chicken, quantity: 100, unit: "g" },
    { id: spinach, quantity: 1, unit: "袋" },
  ]);

  await createInventory(chicken, 0.5, "kg", null);
});

test.afterAll(async () => {
  await resetData();
});

test("提案から不足の少ないレシピを選び、詳細で在庫を確認できる", async ({ page }) => {
  await page.goto("/suggestions");

  const cards = page.locator("main section a[href^='/recipes/']");
  await expect(cards.first()).toContainText("E2E鶏の照り焼き");

  // 不足の少ない順（F6-2）。不足のある案は後ろ
  await expect(cards.nth(1)).toContainText("E2E鶏とほうれん草の炒めもの");
  await expect(cards.nth(1)).toContainText("あと1袋");

  await cards.first().click();

  // R-2 で材料ごとの在庫状態を見る（F3-4）
  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "E2E鶏の照り焼き" })).toBeVisible();
  await expect(page.getByText("E2E鶏もも肉")).toBeVisible();
  await expect(page.getByText("在庫あり", { exact: true })).toBeVisible();
  await expect(page.getByText("鶏肉を焼く")).toBeVisible();
});
