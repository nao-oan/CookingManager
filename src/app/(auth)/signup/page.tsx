import Link from "next/link";
import { SignupForm } from "./signup-form";

/**
 * A-2 新規登録 `/signup`
 * 画面定義: docs/design/screen-design.md 5章
 */
export default function SignupPage() {
  return (
    <main className="flex flex-col gap-6">
      <header className="text-center">
        <p className="font-heading text-lg font-bold">CookingManager</p>
        <p className="text-xs text-ink-mid">冷蔵庫から、家族のしあわせを</p>
      </header>

      <div className="text-center">
        <h1 className="font-heading text-[32px] font-bold text-green-dark">新規登録</h1>
        <p className="text-sm text-ink-mid">毎日のごはん管理を、今日からかんたんに。</p>
      </div>

      <SignupForm />

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-ink-mid">すでにアカウントをお持ちですか？</p>
        <Link
          href="/login"
          className="flex min-h-[52px] w-full max-w-[260px] items-center justify-center rounded-lg border-2 border-green font-heading font-bold text-green"
        >
          ログイン
        </Link>
      </div>
    </main>
  );
}
