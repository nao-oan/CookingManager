import { describeExpiry, type ExpiryLevel } from "@/domain/expiry/expiry";
import type { DateOnly } from "@/types";

/**
 * 期限バッジ（F5-4, F5-5）。画面設計書の .badge に対応する。
 *
 * 色分けは画面設計書3章「期限の色分け」の表に従う。期限切れの指定色
 * `#F4F4F1` は globals.css にトークンが無いため、新しい色を足さず
 * 中立色（bg-mint / text-ink-mid）で代用する。
 */
const STYLES: Record<ExpiryLevel, string> = {
  expired: "bg-mint text-ink-mid",
  today: "bg-danger-bg text-danger",
  soon: "bg-warn-bg text-warn",
  fine: "bg-green-tint text-green-soft",
  none: "bg-mint text-ink-mid",
};

export function ExpiryBadge({ expiresAt, today }: { expiresAt: DateOnly | null; today: DateOnly }) {
  const status = describeExpiry(expiresAt, today);

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${STYLES[status.level]}`}>
      {status.label}
    </span>
  );
}
