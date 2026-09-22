import Link from "next/link";
import { LoginForm } from "./login-form";

/**
 * A-1 ログイン `/login`
 * 画面定義: docs/design/screen-design.md 5章
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const { registered } = await searchParams;

  return (
    <main className="flex flex-col gap-6">
      <header className="text-center">
        <p className="font-heading text-lg font-bold">CookingManager</p>
        <p className="text-xs text-ink-mid">冷蔵庫から、家族のしあわせを</p>
      </header>

      <div className="text-center">
        <h1 className="font-heading text-[32px] font-bold text-green-dark">ログイン</h1>
        <p className="text-sm text-ink-mid">おかえりなさい。今日もおいしい一日を。</p>
      </div>

      {registered && (
        <p className="rounded-sm bg-green-tint px-3 py-2 text-sm text-green-dark">
          登録が完了しました。メールを確認してからログインしてください。
        </p>
      )}

      <LoginForm />

      <div className="text-center">
        <Link href="/reset-password" className="text-sm text-green-dark underline">
          パスワードをお忘れですか？
        </Link>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-ink-mid">はじめての方はこちら</p>
        <Link
          href="/signup"
          className="flex min-h-[52px] w-full max-w-[260px] items-center justify-center rounded-lg border-2 border-green font-heading font-bold text-green"
        >
          新規登録
        </Link>
      </div>
    </main>
  );
}
