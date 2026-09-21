import { requireUser } from "@/lib/auth";

/**
 * S-1 レシピ提案 `/suggestions`
 *
 * ログイン後の初期表示画面。本実装は #30 で行う。
 * ここでは認証の着地先として最小の表示のみ置く。
 */
export default async function SuggestionsPage() {
  const user = await requireUser();

  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold">提案</h1>
      <p className="text-sm text-ink-mid">{user.email} でログインしています。</p>
      <p className="rounded-md bg-mint p-4 text-sm text-ink-mid">
        レシピの提案はフェーズ5（#30）で実装します。
      </p>
    </main>
  );
}
