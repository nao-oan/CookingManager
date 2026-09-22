import { expect, test, type Page } from "@playwright/test";
import { AUTH_STATE } from "./fixtures/auth";
import { createIngredient, createInventory, createRecipe, resetData } from "./fixtures/db";

/**
 * 非機能要件の確認（#32）。
 *
 * NFR-8  375px で横スクロールが出ない。下部タブの当たり判定が44px以上
 * NFR-9  在庫追加と食事記録が3タップ以内
 * NFR-10 削除は実行前に確認する
 * NFR-4  他人のデータに到達できない
 *
 * NFR-2（提案の算出が1秒以内）は単体の性能試験と実データでの計測で確認する。
 * NFR-16 のブラウザ横断は playwright.config.ts の projects で担保する。
 */
test.use({ storageState: AUTH_STATE });

let ingredientId: string;
let recipeId: string;
let inventoryId: string;
let spareIngredientId: string;

const TODAY = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

test.beforeAll(async () => {
  await resetData();
  ingredientId = await createIngredient("E2E検証用食材", "g");
  recipeId = await createRecipe(
    "E2E検証用レシピ",
    [{ id: ingredientId, quantity: 100, unit: "g" }],
    ["切る"],
  );
  inventoryId = await createInventory(ingredientId, 200, "g", "2099-12-31");
  // 参照されている食材は削除できないため、確認ダイアログの検証用に1件だけ別に作る
  spareIngredientId = await createIngredient("E2E未使用食材", "g");
});

test.afterAll(async () => {
  await resetData();
});

/** 横スクロールが出ていないか。1px の誤差は丸めの範囲として許す */
async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth > 1,
  );
}

test("NFR-8 全19画面が375px幅で横スクロールしない", async ({ page, browser }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  // 要ログインの15画面
  const authed = [
    ["S-1", "/suggestions"],
    ["R-1", "/recipes"],
    ["R-2", `/recipes/${recipeId}`],
    ["R-3", "/recipes/new"],
    ["R-4", `/recipes/${recipeId}/edit`],
    ["P-1", "/pantry"],
    ["P-2", "/pantry/new"],
    ["P-3", `/pantry/${inventoryId}/edit`],
    ["M-1", "/meals"],
    ["M-2", `/meals/${TODAY}`],
    ["M-3", `/meals/${TODAY}/dinner/edit`],
    ["C-1", "/settings"],
    ["C-2", "/settings/ingredients"],
    ["C-3", `/settings/ingredients/${ingredientId}/edit`],
    // A-4 は通常のセッションでも開ける（復旧セッションは A-4 の保存時にだけ要る）
    ["A-4", "/reset-password/new"],
  ] as const;

  for (const [name, path] of authed) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(await hasHorizontalScroll(page), `${name} ${path} で横スクロールが出ている`).toBe(false);
  }

  // 未ログインの4画面は別のコンテキストで開く
  const guest = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const guestPage = await guest.newPage();

  for (const [name, path] of [
    ["L-1", "/"],
    ["A-1", "/login"],
    ["A-2", "/signup"],
    ["A-3", "/reset-password"],
  ] as const) {
    await guestPage.goto(path);
    await expect(guestPage.locator("main")).toBeVisible();
    expect(await hasHorizontalScroll(guestPage), `${name} ${path} で横スクロールが出ている`).toBe(
      false,
    );
  }

  await guest.close();
});

test("NFR-8 下部タブの当たり判定が44px以上ある", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/suggestions");

  const tabs = page.getByRole("navigation").getByRole("link");
  await expect(tabs).toHaveCount(4);

  for (const tab of await tabs.all()) {
    const box = await tab.boundingBox();
    expect(box!.height, `タブ「${await tab.innerText()}」の高さ`).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
});

test("NFR-9 在庫の追加が3タップ以内で終わる", async ({ page }) => {
  await page.goto("/pantry");

  // 1タップ目
  await page.getByRole("link", { name: "在庫を追加" }).click();
  await page.getByLabel("食材名で検索").fill("E2E検証用食材");
  // 2タップ目
  await page.getByRole("button", { name: /^E2E検証用食材/ }).click();
  // 3タップ目（数量は既定値のまま）
  await page.getByRole("button", { name: "在庫に追加" }).click();

  await expect(page).toHaveURL(/\/pantry$/);
});

test("NFR-9 レシピ詳細からの食事記録が3タップ以内で終わる", async ({ page }) => {
  await page.goto(`/recipes/${recipeId}`);

  // 1タップ目
  await page.getByRole("link", { name: "食べた記録をつける" }).click();
  // 2タップ目（当日・直近の区分・レシピが既定で入っている）
  await page.getByRole("button", { name: /の記録を保存/ }).click();

  await expect(page).toHaveURL(new RegExp(`/recipes/${recipeId}$`));
});

test("NFR-10 削除は実行前に必ず確認する", async ({ page }) => {
  // R-4 レシピ
  await page.goto(`/recipes/${recipeId}/edit`);
  await page.getByRole("button", { name: "このレシピを削除" }).click();
  await expect(page.getByText("レシピを削除しますか？")).toBeVisible();
  await page.getByRole("button", { name: "キャンセル" }).click();
  await expect(page).toHaveURL(new RegExp(`/recipes/${recipeId}/edit$`));

  // P-3 在庫
  await page.goto(`/pantry/${inventoryId}/edit`);
  await page.getByRole("button", { name: "この在庫を削除" }).click();
  await expect(page.getByText(/削除しますか/)).toBeVisible();

  // C-3 食材
  await page.goto(`/settings/ingredients/${spareIngredientId}/edit`);
  await page.getByRole("button", { name: "この食材を削除" }).click();
  await expect(page.getByText(/削除しますか/)).toBeVisible();

  // C-1 ログアウトも確認を挟む
  await page.goto("/settings");
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page.getByText("ログアウトしますか？")).toBeVisible();
});

test("NFR-4 他人のデータには到達できない", async ({ page }) => {
  // 実在しない、または自分のものではない ID は 404 になる
  const foreign = "11111111-1111-1111-1111-111111111111";

  for (const path of [
    `/recipes/${foreign}`,
    `/recipes/${foreign}/edit`,
    `/pantry/${foreign}/edit`,
    `/settings/ingredients/${foreign}/edit`,
  ]) {
    const response = await page.goto(path);
    expect(response!.status(), `${path} の応答`).toBe(404);
  }
});

test("ログイン済みでランディングを開くと S-1 へ送られる（画面設計 L-1）", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/suggestions/);
});
