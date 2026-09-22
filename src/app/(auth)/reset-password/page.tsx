import Link from "next/link";
import { ResetRequestForm } from "./reset-request-form";

/**
 * A-3 パスワード再設定の依頼 `/reset-password`
 *
 * 画面設計書8章3（未確定事項）で保留にしていた画面。A-1 のリンク先にあたる。
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <main className="flex flex-col gap-6">
      <header className="text-center">
        <p className="font-heading text-lg font-bold">CookingManager</p>
        <p className="text-xs text-ink-mid">冷蔵庫から、家族のしあわせを</p>
      </header>

      <div className="text-center">
        <h1 className="font-heading text-[28px] font-bold text-green-dark">パスワードの再設定</h1>
        <p className="text-sm text-ink-mid">
          登録したメールアドレスに、再設定用のリンクを送ります。
        </p>
      </div>

      {error === "expired" && (
        <p role="alert" className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">
          リンクの有効期限が切れています。もう一度送信してください。
        </p>
      )}

      {sent ? (
        <div className="flex flex-col gap-3 rounded-lg bg-white p-5 text-center shadow-sm">
          <p className="font-heading font-bold">メールを送信しました</p>
          <p className="text-sm text-ink-mid">
            届いたメールのリンクから、新しいパスワードを設定してください。
            登録がないアドレスにはメールは届きません。
          </p>
        </div>
      ) : (
        <ResetRequestForm />
      )}

      <div className="flex flex-col items-center gap-2">
        <Link href="/login" className="text-sm text-green-dark underline">
          ログイン画面へ戻る
        </Link>
      </div>
    </main>
  );
}
