/** 材料タグ。画面設計書の .tag に対応する */
export function IngredientTag({ name }: { name: string }) {
  return <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] text-ink-mid">{name}</span>;
}
