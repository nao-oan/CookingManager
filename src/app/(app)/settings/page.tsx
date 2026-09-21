import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

/**
 * C-1 設定 `/settings`
 * 画面定義: docs/design/screen-design.md 5章
 */
export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-center font-heading text-xl font-bold">設定</h1>

      <section className="rounded-md bg-mint p-4">
        <p className="font-heading font-bold">アカウント</p>
        <p className="text-sm text-ink-mid">{user.email}</p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-tint px-2.5 py-1 text-xs text-green-dark">
          ログイン中
        </span>
      </section>

      <section className="flex flex-col gap-2">
        <p className="font-heading font-bold">管理</p>
        <Link
          href="/settings/ingredients"
          className="flex items-center justify-between rounded-md bg-white p-4 shadow-sm"
        >
          <span>
            <span className="block font-bold">食材一覧</span>
            <span className="block text-sm text-ink-mid">食材・単位・常備食材を管理</span>
          </span>
          <span aria-hidden>›</span>
        </Link>
      </section>

      <SignOutButton />
    </main>
  );
}
