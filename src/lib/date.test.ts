import { describe, expect, it } from "vitest";
import {
  addDays,
  currentMealSlot,
  dayOfMonth,
  formatDateJa,
  formatDayJa,
  formatMonthJa,
  isValidDateOnly,
  monthBounds,
  monthGrid,
  shiftMonth,
  startOfWeek,
  todayInTokyo,
  weekdayJa,
} from "./date";

describe("formatDateJa", () => {
  it("Asia/Tokyo の日付で表示する", () => {
    expect(formatDateJa(new Date("2026-08-12T05:00:00Z"))).toBe("2026年8月12日");
  });

  it("UTC では前日になる時刻でも日本時間の日付になる（NFR-11）", () => {
    // UTC 2026-08-11 23:00 は日本時間で 8月12日 8時
    expect(formatDateJa(new Date("2026-08-11T23:00:00Z"))).toBe("2026年8月12日");
  });
});

describe("todayInTokyo", () => {
  it("YYYY-MM-DD で返す", () => {
    expect(todayInTokyo(new Date("2026-09-22T03:00:00Z"))).toBe("2026-09-22");
  });

  it("UTC の前日でも日本時間の日付を返す（NFR-11）", () => {
    // UTC 2026-09-21 15:00 は日本時間で 9月22日 0時
    expect(todayInTokyo(new Date("2026-09-21T15:00:00Z"))).toBe("2026-09-22");
  });

  it("月初・年初でも桁が崩れない", () => {
    expect(todayInTokyo(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });
});

describe("currentMealSlot", () => {
  it("時刻から直近の食事区分を決める", () => {
    // いずれも日本時間。UTC+9 で指定する
    expect(currentMealSlot(new Date("2026-09-21T22:00:00Z"))).toBe("breakfast"); // 7時
    expect(currentMealSlot(new Date("2026-09-22T03:00:00Z"))).toBe("lunch"); // 12時
    expect(currentMealSlot(new Date("2026-09-22T10:00:00Z"))).toBe("dinner"); // 19時
    expect(currentMealSlot(new Date("2026-09-22T14:00:00Z"))).toBe("snack"); // 23時
  });

  it("深夜0時は snack になる", () => {
    expect(currentMealSlot(new Date("2026-09-21T15:00:00Z"))).toBe("snack");
  });

  it("区分の境目", () => {
    expect(currentMealSlot(new Date("2026-09-21T19:00:00Z"))).toBe("breakfast"); // 4時
    expect(currentMealSlot(new Date("2026-09-22T02:00:00Z"))).toBe("lunch"); // 11時
    expect(currentMealSlot(new Date("2026-09-22T06:00:00Z"))).toBe("dinner"); // 15時
    expect(currentMealSlot(new Date("2026-09-22T12:00:00Z"))).toBe("snack"); // 21時
  });
});

describe("isValidDateOnly", () => {
  it("YYYY-MM-DD の実在する日付だけを通す", () => {
    expect(isValidDateOnly("2026-09-21")).toBe(true);
    expect(isValidDateOnly("2024-02-29")).toBe(true);
  });

  it("形式が違う値をはじく", () => {
    expect(isValidDateOnly("2026-9-21")).toBe(false);
    expect(isValidDateOnly("2026/09/21")).toBe(false);
    expect(isValidDateOnly("")).toBe(false);
  });

  it("存在しない日付をはじく", () => {
    expect(isValidDateOnly("2026-02-30")).toBe(false);
    expect(isValidDateOnly("2026-13-01")).toBe(false);
    expect(isValidDateOnly("2025-02-29")).toBe(false);
  });
});

describe("addDays", () => {
  it("日をまたいで加減算する", () => {
    expect(addDays("2026-09-21", 1)).toBe("2026-09-22");
    expect(addDays("2026-09-21", -1)).toBe("2026-09-20");
  });

  it("月末・年末をまたぐ", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("うるう年の2月をまたぐ", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });
});

describe("startOfWeek", () => {
  it("その週の月曜日を返す", () => {
    // 2026-09-21 は月曜
    expect(startOfWeek("2026-09-21")).toBe("2026-09-21");
    expect(startOfWeek("2026-09-23")).toBe("2026-09-21");
  });

  it("日曜は同じ週の月曜に戻る", () => {
    // 2026-09-27 は日曜
    expect(startOfWeek("2026-09-27")).toBe("2026-09-21");
  });

  it("月をまたいで戻る", () => {
    // 2026-10-01 は木曜
    expect(startOfWeek("2026-10-01")).toBe("2026-09-28");
  });
});

describe("shiftMonth", () => {
  it("前後の月に移る", () => {
    expect(shiftMonth(2026, 9, 1)).toEqual({ year: 2026, month: 10 });
    expect(shiftMonth(2026, 9, -1)).toEqual({ year: 2026, month: 8 });
  });

  it("年をまたぐ", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("monthBounds", () => {
  it("月の初日と末日を返す", () => {
    expect(monthBounds(2026, 9)).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(monthBounds(2026, 12)).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });

  it("うるう年の2月は29日まで", () => {
    expect(monthBounds(2024, 2).end).toBe("2024-02-29");
    expect(monthBounds(2025, 2).end).toBe("2025-02-28");
  });
});

describe("monthGrid", () => {
  it("月曜始まりで、1日の前を null で埋める", () => {
    // 2026-09-01 は火曜なので、先頭に月曜分の1コマが空く
    const grid = monthGrid(2026, 9);
    expect(grid[0]).toBeNull();
    expect(grid[1]).toBe("2026-09-01");
    expect(grid).toHaveLength(31);
    expect(grid.at(-1)).toBe("2026-09-30");
  });

  it("1日が月曜の月は空きが出ない", () => {
    // 2026-06-01 は月曜
    expect(monthGrid(2026, 6)[0]).toBe("2026-06-01");
  });

  it("1日が日曜の月は6コマ空く", () => {
    // 2026-11-01 は日曜
    const grid = monthGrid(2026, 11);
    expect(grid.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(grid[6]).toBe("2026-11-01");
  });
});

describe("weekdayJa / dayOfMonth", () => {
  it("曜日と日を取り出す", () => {
    expect(weekdayJa("2026-09-21")).toBe("月");
    expect(weekdayJa("2026-09-27")).toBe("日");
    expect(dayOfMonth("2026-09-05")).toBe(5);
  });
});

describe("formatDayJa / formatMonthJa", () => {
  it("見出しの表記にする", () => {
    expect(formatDayJa("2026-09-21")).toBe("9月21日（月）");
    expect(formatDayJa("2026-12-05")).toBe("12月5日（土）");
    expect(formatMonthJa(2026, 9)).toBe("2026年9月");
  });
});
