import { TabBar } from "@/components/app/tab-bar";

/**
 * 要ログインのレイアウト。下部タブを置く。
 * （docs/design/screen-design.md 6章 規則1）
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[390px]">
      <div className="px-4 pt-4 pb-[84px]">{children}</div>
      <TabBar />
    </div>
  );
}
