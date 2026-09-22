/**
 * 日付の表示と計算。表示は常に Asia/Tokyo で行う（NFR-11）。
 *
 * 保存は UTC の timestamptz なので、日本時間の朝9時以前に作られた行を
 * UTC のまま表示すると前日にずれる。変換はここに集約する。
 */
import type { DateOnly, MealSlot } from "@/types";

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

/*
 * ここから下は YYYY-MM-DD 同士の計算（M-1 の月グリッドと M-2 の週バー）。
 *
 * 日付はすでに Asia/Tokyo で決まった値なので、加減算に実行環境の時差が
 * 混ざらないよう UTC の Date を経由する。
 */

/** 曜日の表記。Date.getUTCDay() の 0=日曜 に合わせて並べる */
const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** カレンダーの曜日見出し。月曜始まり（モックアップ m-1 の曜日行） */
export const WEEK_HEADERS = ["月", "火", "水", "木", "金", "土", "日"] as const;

function toUtc(date: DateOnly): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtc(value: Date): DateOnly {
  return value.toISOString().slice(0, 10);
}

/**
 * YYYY-MM-DD として実在する日付かを確かめる。
 * URL の [date] をそのままクエリに渡さないための入口の検査。
 */
export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // 2026-02-30 のような日付は Date が繰り上げてしまうので、往復させて確かめる
  return fromUtc(toUtc(value)) === value;
}

export function addDays(date: DateOnly, days: number): DateOnly {
  const shifted = toUtc(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return fromUtc(shifted);
}

/** その日を含む週の月曜日。M-2 の週バーの起点 */
export function startOfWeek(date: DateOnly): DateOnly {
  // getUTCDay() は 0=日曜。月曜を0にずらしてから引く
  return addDays(date, -((toUtc(date).getUTCDay() + 6) % 7));
}

/** 月をずらす。12月の次は翌年1月に繰り上がる */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** 月の初日と末日。M-1 の範囲取得に使う（idx_meals_owner_date） */
export function monthBounds(year: number, month: number): { start: DateOnly; end: DateOnly } {
  return {
    start: fromUtc(new Date(Date.UTC(year, month - 1, 1))),
    // 翌月0日 = 当月末日
    end: fromUtc(new Date(Date.UTC(year, month, 0))),
  };
}

/**
 * 月グリッドの並び。月曜始まりで、1日より前の空きを null で埋める。
 * 末尾は埋めない（最終週の余りはグリッドの折り返しに任せる）。
 */
export function monthGrid(year: number, month: number): (DateOnly | null)[] {
  const { start, end } = monthBounds(year, month);
  const lead = (toUtc(start).getUTCDay() + 6) % 7;
  const days = Number(end.slice(8));

  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, index) => addDays(start, index)),
  ];
}

/** 曜日1文字。週バーと日付見出しに出す */
export function weekdayJa(date: DateOnly): string {
  return WEEKDAY_JA[toUtc(date).getUTCDay()];
}

/** 日（1〜31）。週バーの数字に使う */
export function dayOfMonth(date: DateOnly): number {
  return Number(date.slice(8));
}

/** 9月21日（月） */
export function formatDayJa(date: DateOnly): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}月${day}日（${weekdayJa(date)}）`;
}

/** 2026年9月 */
export function formatMonthJa(year: number, month: number): string {
  return `${year}年${month}月`;
}
