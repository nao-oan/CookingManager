import Link from "next/link";
/**
 * L-1 ランディング `/`
 *
 * 雛形段階の最小実装。掲載内容はサイトマップ2章と docs/design/mockups/html/l-1.html
 * を参照し、フェーズ2以降で作り込む。
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-8 px-4 py-10">
      <header>
        <p className="font-heading text-lg font-bold">CookingManager</p>
        <p className="text-xs text-ink-mid">冷蔵庫から、家族のしあわせを</p>
      </header>

      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-[28px] leading-tight font-bold">
          冷蔵庫の残りから、
          <br />
          今日の献立を。
        </h1>
        <p className="text-sm text-ink-mid">毎日の料理を、もっとかんたんに。</p>
      </div>

      <ul className="flex flex-col gap-2">
        {[
          { title: "レシピ登録", body: "お気に入りのレシピを保存。" },
          { title: "食事記録", body: "食べたものをかんたんに記録。" },
          { title: "在庫からレシピ提案", body: "冷蔵庫の食材からぴったりの献立を。" },
        ].map((feature) => (
          <li key={feature.title} className="rounded-md bg-mint p-4">
            <p className="font-heading font-bold">{feature.title}</p>
            <p className="text-sm text-ink-mid">{feature.body}</p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <Link
          href="/signup"
          className="flex min-h-[52px] items-center justify-center rounded-lg bg-green font-heading font-bold text-cream"
        >
          はじめる
        </Link>
        <Link
          href="/login"
          className="flex min-h-[52px] items-center justify-center rounded-lg border-2 border-green font-heading font-bold text-green"
        >
          ログイン
        </Link>
      </div>

      <p className="text-xs text-ink-weak">
        雛形段階の画面です。各機能はフェーズ2以降で実装します。
      </p>
    </main>
  );
}
