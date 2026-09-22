import Link from "next/link";
import type { ReactNode } from "react";

/** 戻る矢印つきのヘッダー。画面設計書の .subbar に対応する */
export function SubBar({
  title,
  backHref,
  action,
}: {
  title: string;
  backHref: string;
  /** 右端に置く操作（編集リンクなど）。無ければ空けておく */
  action?: ReactNode;
}) {
  return (
    <header className="mb-2 grid grid-cols-[32px_1fr_auto] items-center">
      <Link href={backHref} aria-label="戻る" className="text-2xl leading-none text-green">
        ‹
      </Link>
      <h1 className="text-center font-heading text-lg font-bold">{title}</h1>
      <span className="min-w-8 text-right">{action}</span>
    </header>
  );
}
