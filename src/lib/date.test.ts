import { describe, expect, it } from "vitest";
import { currentMealSlot, formatDateJa, todayInTokyo } from "./date";

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
