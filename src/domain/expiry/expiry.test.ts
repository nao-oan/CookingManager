import { describe, expect, it } from "vitest";
import { describeExpiry } from "./expiry";

const TODAY = "2026-09-22";

describe("describeExpiry", () => {
  it("期限なしは判定の対象外", () => {
    expect(describeExpiry(null, TODAY)).toEqual({
      level: "none",
      daysLeft: null,
      label: "期限なし",
    });
  });

  it("当日は「今日まで」", () => {
    expect(describeExpiry("2026-09-22", TODAY)).toEqual({
      level: "today",
      daysLeft: 0,
      label: "今日まで",
    });
  });

  it("1〜3日は警告（F5-4）", () => {
    expect(describeExpiry("2026-09-23", TODAY)).toEqual({
      level: "soon",
      daysLeft: 1,
      label: "あと1日",
    });
    expect(describeExpiry("2026-09-25", TODAY)).toEqual({
      level: "soon",
      daysLeft: 3,
      label: "あと3日",
    });
  });

  it("4日以上は余裕あり", () => {
    expect(describeExpiry("2026-09-26", TODAY)).toEqual({
      level: "fine",
      daysLeft: 4,
      label: "あと4日",
    });
  });

  it("前日以前は期限切れ（F5-5）", () => {
    expect(describeExpiry("2026-09-21", TODAY)).toEqual({
      level: "expired",
      daysLeft: -1,
      label: "期限切れ",
    });
  });

  it("月をまたいでも日数が合う", () => {
    expect(describeExpiry("2026-10-01", "2026-09-30").daysLeft).toBe(1);
    expect(describeExpiry("2026-03-01", "2026-02-28").daysLeft).toBe(1);
  });

  it("年をまたいでも日数が合う", () => {
    expect(describeExpiry("2027-01-01", "2026-12-31").daysLeft).toBe(1);
  });

  it("うるう日を含む差も数えられる", () => {
    // 2028年はうるう年。2月は29日まである
    expect(describeExpiry("2028-03-01", "2028-02-28").daysLeft).toBe(2);
  });
});
