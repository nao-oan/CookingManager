import { NewPasswordForm } from "./new-password-form";

/**
 * A-4 新しいパスワードの設定 `/reset-password/new`
 *
 * メールのリンク（/auth/callback）で復旧セッションが張られた状態で開く。
 * セッションが無い場合は proxy が /login へ送る。
 */
export default function NewPasswordPage() {
  return (
    <main className="flex flex-col gap-6">
      <header className="text-center">
        <p className="font-heading text-lg font-bold">CookingManager</p>
        <p className="text-xs text-ink-mid">冷蔵庫から、家族のしあわせを</p>
      </header>

      <div className="text-center">
        <h1 className="font-heading text-[28px] font-bold text-green-dark">新しいパスワード</h1>
        <p className="text-sm text-ink-mid">8文字以上で設定してください。</p>
      </div>

      <NewPasswordForm />
    </main>
  );
}
