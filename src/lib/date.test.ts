import { describe, expect, it } from "vitest";
import { formatDateJa } from "./date";

describe("formatDateJa", () => {
  it("Asia/Tokyo の日付で表示する", () => {
    expect(formatDateJa(new Date("2026-08-12T05:00:00Z"))).toBe("2026年8月12日");
  });

  it("UTC では前日になる時刻でも日本時間の日付になる（NFR-11）", () => {
    // UTC 2026-08-11 23:00 は日本時間で 8月12日 8時
    expect(formatDateJa(new Date("2026-08-11T23:00:00Z"))).toBe("2026年8月12日");
  });
});
