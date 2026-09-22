/**
 * 日付の表示と計算。表示は常に Asia/Tokyo で行う（NFR-11）。
 *
 * 保存は UTC の timestamptz なので、日本時間の朝9時以前に作られた行を
 * UTC のまま表示すると前日にずれる。変換はここに集約する。
 */
const TIME_ZONE = "Asia/Tokyo";

const JA_DATE = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** 2026年8月12日 の形にする */
export function formatDateJa(value: Date): string {
  return JA_DATE.format(value);
}
