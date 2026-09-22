import { expect, type Page } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD } from "./db";

/** ログイン済みのブラウザ状態の保存先。global-setup が書き、各テストが読む */
export const AUTH_STATE = "e2e/.auth/state.json";

/** A-1 からログインして S-1 まで進む */
export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(TEST_EMAIL);
  await page.getByLabel("パスワード").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/suggestions/);
}
