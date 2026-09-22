/**
 * 日付の表示と計算。表示は常に Asia/Tokyo で行う（NFR-11）。
 *
 * 保存は UTC の timestamptz なので、日本時間の朝9時以前に作られた行を
 * UTC のまま表示すると前日にずれる。変換はここに集約する。
 */
import type { DateOnly } from "@/types";

const TIME_ZONE = "Asia/Tokyo";

const JA_DATE = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
});

const ISO_PARTS = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  // ja-JP は hour12: false だと深夜0時を「24」と返すことがあるため明示する
  hourCycle: "h23",
});

/** 2026年8月12日 の形にする */
export function formatDateJa(value: Date): string {
  return JA_DATE.format(value);
}

function tokyoParts(value: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of ISO_PARTS.formatToParts(value)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return parts;
}

/** Asia/Tokyo における日付（YYYY-MM-DD）。在庫の期限判定と食事記録の日付に使う */
export function todayInTokyo(now: Date = new Date()): DateOnly {
  const { year, month, day } = tokyoParts(now);
  return `${year}-${month}-${day}`;
}

/** 食事区分（F4-1） */
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

/**
 * 時刻から直近の食事区分を決める。
 *
 * R-2 から M-3 へ渡す既定値に使う（3タップで記録を終えるため / NFR-9）。
 * 区切りは要件にないため設計上の決定。深夜から早朝は snack（夜食）に寄せる。
 */
export function currentMealSlot(now: Date = new Date()): MealSlot {
  const hour = Number(tokyoParts(now).hour);

  if (hour >= 4 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 21) return "dinner";
  return "snack";
}
