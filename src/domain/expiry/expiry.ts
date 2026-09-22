/**
 * 賞味期限の表示状態（F5-4, F5-5）。
 *
 * 出典: docs/design/screen-design.md 3章「期限の色分け」
 * 今日の日付は呼び出し側から受け取る。ここで現在時刻を直接見ると、
 * 日付をまたぐたびに結果が変わって単体テストできなくなる（NFR-13）。
 */
import type { DateOnly } from "../../types";

/** 色分けの段階。画面設計書3章の表の各行に対応する */
export type ExpiryLevel =
  /** 期限切れ。レシピの提案から除外される（F5-5） */
  | "expired"
  /** 当日まで */
  | "today"
  /** 1〜3日 */
  | "soon"
  /** 4日以上 */
  | "fine"
  /** 期限なし。判定の対象外 */
  | "none";

export interface ExpiryStatus {
  level: ExpiryLevel;
  /** 今日からの残日数。期限なしは null、期限切れは負の値 */
  daysLeft: number | null;
  /** バッジに出す文言 */
  label: string;
}

/** 警告に切り替える残日数の境目（画面設計書3章） */
const WARN_DAYS = 3;

const MS_PER_DAY = 86_400_000;

export function describeExpiry(expiresAt: DateOnly | null, today: DateOnly): ExpiryStatus {
  if (expiresAt === null) return { level: "none", daysLeft: null, label: "期限なし" };

  const daysLeft = daysBetween(today, expiresAt);

  if (daysLeft < 0) return { level: "expired", daysLeft, label: "期限切れ" };
  if (daysLeft === 0) return { level: "today", daysLeft, label: "今日まで" };

  return {
    level: daysLeft <= WARN_DAYS ? "soon" : "fine",
    daysLeft,
    label: `あと${daysLeft}日`,
  };
}

/**
 * YYYY-MM-DD 同士の日数差。
 *
 * どちらも UTC の深夜として解釈する。実行環境のタイムゾーンを見ないため、
 * サーバーがどこにあっても同じ結果になる（NFR-11）。
 */
function daysBetween(from: DateOnly, to: DateOnly): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY;
}
