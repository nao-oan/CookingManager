import type { IngredientMatch } from "@/domain/suggestion";

/**
 * 材料ごとの在庫状態バッジ（F3-4, F6-3, F6-4, F6-6）。
 * 文言と色は画面設計書 5章 R-2 の「材料の在庫状態」に合わせる。
 */
export function StockBadge({ match }: { match: IngredientMatch }) {
  const { label, className } = describe(match);

  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${className}`}>{label}</span>;
}

function describe(match: IngredientMatch): { label: string; className: string } {
  switch (match.state) {
    case "satisfied":
      return { label: "在庫あり", className: "bg-green-tint text-green-dark" };

    case "staple":
      // 判定対象外。数量を見ていないことが分かる文言にする
      return { label: "常備食材", className: "bg-mint text-ink-mid" };

    case "unknown":
      return { label: "在庫あり（数量不明）", className: "bg-mint text-ink-mid" };

    case "missing":
      return {
        label: match.shortage
          ? `あと${format(match.shortage.quantity)}${match.shortage.unit}`
          : "不足",
        className: "bg-warn-bg text-warn",
      };
  }
}

/** 200 は「200」、200.5 は「200.5」。末尾の0は出さない */
function format(quantity: number): string {
  return String(quantity);
}
