"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 下部タブ。提案／レシピ／冷蔵庫／記録 の4つで固定する
 * （docs/design/screen-design.md 6章 規則1）。
 */
const TABS = [
  { href: "/suggestions", label: "提案" },
  { href: "/recipes", label: "レシピ" },
  { href: "/pantry", label: "冷蔵庫" },
  { href: "/meals", label: "記録" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 flex h-[84px] w-full max-w-[390px] -translate-x-1/2 border-t border-line bg-cream pb-3">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 items-center justify-center text-xs ${
              active ? "font-bold text-green" : "text-ink-mid"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
