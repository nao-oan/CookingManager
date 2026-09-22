import { chromium, type FullConfig } from "@playwright/test";
import { AUTH_STATE, login } from "./fixtures/auth";
import { resetData } from "./fixtures/db";

/**
 * 実行前の準備。
 *
 * 1. テストアカウントのデータを空にする（導線1が空状態を見るため）
 * 2. 1回だけログインして、ログイン済みの状態を保存する
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  // 接続は global-teardown と共有するため、ここでは閉じない
  await resetData();

  const baseURL = config.projects[0].use.baseURL!;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  await login(page);
  await page.context().storageState({ path: AUTH_STATE });
  await browser.close();
}
