import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

/**
 * E2E の設定（サイトマップ4章の主要導線5本）。
 *
 * 本番相当のビルドに対して実行する。dev サーバーだと初回アクセスの
 * コンパイル待ちでタイムアウトの揺れが大きいため。
 * 1ユーザー分のデータを共有するので、並列実行はしない。
 */
loadEnv({ path: ".env.local", quiet: true });

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // 同じテストアカウントのデータを触るため直列で回す
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL,
    // 画面幅は iPhone 相当。375px で横スクロールが出ないことも見る（NFR-8）
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  // NFR-16 は Chrome / Safari / Edge の最新2バージョン。Edge は Chromium なので
  // chromium で、Safari は WebKit で代表させる。実機での確認は別途行う
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  webServer: {
    // ビルドから通しで行う。NEXT_PUBLIC_* は**ビルド時に値が埋め込まれる**ため、
    // 実行時に環境変数を渡すだけでは向き先を変えられない。
    // ローカルには .env.production.local（本番プロジェクト）があり、これが
    // .env.local より優先されるので、テスト用アカウントのある開発プロジェクトの値を
    // 明示的に渡してビルドし直す。CI には .env.* が無く、シークレットがそのまま使われる。
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      DATABASE_URL: process.env.DATABASE_URL!,
    },
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
