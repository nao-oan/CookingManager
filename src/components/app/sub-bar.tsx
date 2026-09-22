import Link from "next/link";

/** 戻る矢印つきのヘッダー。画面設計書の .subbar に対応する */
export function SubBar({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="mb-2 grid grid-cols-[32px_1fr_32px] items-center">
      <Link href={backHref} aria-label="戻る" className="text-2xl leading-none text-green">
        ‹
      </Link>
      <h1 className="text-center font-heading text-lg font-bold">{title}</h1>
      <span />
    </header>
  );
}
