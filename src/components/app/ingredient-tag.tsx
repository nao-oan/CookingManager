/**
 * 材料タグ。画面設計書の .tag に対応する。
 * 不足している材料は点線枠で示す（F6-3 / .tag--missing）。
 */
export function IngredientTag({ name, missing = false }: { name: string; missing?: boolean }) {
  return (
    <span
      className={
        missing
          ? "rounded-full border border-dashed border-warn px-2 py-0.5 text-[10px] text-warn"
          : "rounded-full bg-mint px-2 py-0.5 text-[10px] text-ink-mid"
      }
    >
      {name}
    </span>
  );
}
