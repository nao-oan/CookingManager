import { expect, test } from "@playwright/test";

/**
 * パスワード再設定（A-3 / A-4）。
 *
 * メールの受信を伴う部分（リンクを開いて復旧セッションを張る）は E2E では
 * 確認できないため、手前と奥をそれぞれ押さえる。
 * ログインしていない状態で確認するので storageState は使わない。
 */

test("A-1 から再設定を依頼できる", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "パスワードをお忘れですか？" }).click();

  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByRole("heading", { name: "パスワードの再設定" })).toBeVisible();
  await expect(page.getByLabel("メールアドレス")).toBeVisible();
});

test("送信済みの表示では結果を明かさない", async ({ page }) => {
  await page.goto("/reset-password?sent=1");

  await expect(page.getByText("メールを送信しました")).toBeVisible();
  // 登録の有無が分かる文言を出さない（アカウントの洗い出しを防ぐ）
  await expect(page.getByText("登録がないアドレスにはメールは届きません")).toBeVisible();
});

test("期限切れ・不正なリンクは理由を添えて依頼画面へ戻す", async ({ page }) => {
  await page.goto("/auth/callback?code=invalid-code&next=/reset-password/new");

  await expect(page).toHaveURL(/\/reset-password\?error=expired/);
  await expect(page.getByText(/有効期限が切れています/)).toBeVisible();
});

test("復旧セッションが無ければ新しいパスワードは設定できない", async ({ page }) => {
  await page.goto("/reset-password/new");

  await expect(page).toHaveURL(/\/login/);
});
