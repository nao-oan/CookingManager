/**
 * 未ログイン向けのレイアウト（A-1 / A-2）。
 * 下部タブは置かない（docs/design/screen-design.md 6章 規則2）。
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh w-full max-w-[390px] px-4 py-8">{children}</div>;
}
