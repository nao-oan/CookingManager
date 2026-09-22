import { expect, test } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD } from "./fixtures/db";

/**
 * 導線1 初回利用（サイトマップ4章）。
 * L-1 →「はじめる」→ A-2 → ログイン → S-1 の空状態から登録へ誘導される。
 *
 * このファイルだけログインしていない状態から始める。
 */
test("ランディングから新規登録を見て、ログイン後に空状態の案内が出る", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /冷蔵庫の残りから/ })).toBeVisible();

  await page.getByRole("link", { name: "はじめる" }).click();
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByLabel("メールアドレス")).toBeVisible();
  await expect(page.getByLabel("パスワード", { exact: true })).toBeVisible();

  // 既にアカウントがある場合の導線をたどる
  await page.getByRole("link", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("メールアドレス").fill(TEST_EMAIL);
  await page.getByLabel("パスワード").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "ログイン" }).click();

  // S-1 が初期表示。データが無いので登録への導線が出る（F6-7）
  await expect(page).toHaveURL(/\/suggestions/);
  await expect(page.getByText("レシピがまだありません")).toBeVisible();
  await expect(page.getByRole("link", { name: "レシピを登録する" })).toBeVisible();

  // 375px でも横スクロールが出ない（NFR-8）
  await page.setViewportSize({ width: 375, height: 812 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
