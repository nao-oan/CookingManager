import { describe, expect, it } from "vitest";
import { escapeLike, isPgErrorCode } from "./sql";

describe("escapeLike", () => {
  it("ワイルドカードを文字として扱えるようにする", () => {
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
  });

  it("バックスラッシュ自身もエスケープする", () => {
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });

  it("通常の文字はそのまま返す", () => {
    expect(escapeLike("ほうれん草")).toBe("ほうれん草");
  });
});

describe("isPgErrorCode", () => {
  it("エラー自身のコードを見る", () => {
    expect(isPgErrorCode({ code: "23505" }, "23505")).toBe(true);
    expect(isPgErrorCode({ code: "23503" }, "23505")).toBe(false);
  });

  it("Drizzle が包んだ cause の中まで辿る", () => {
    const wrapped = new Error("query failed", { cause: { code: "23503" } });
    expect(isPgErrorCode(wrapped, "23503")).toBe(true);
  });

  it("コードを持たない値では false", () => {
    expect(isPgErrorCode(null, "23505")).toBe(false);
    expect(isPgErrorCode("boom", "23505")).toBe(false);
    expect(isPgErrorCode(new Error("boom"), "23505")).toBe(false);
  });

  it("cause が循環していても止まる", () => {
    const a: { code?: string; cause?: unknown } = {};
    a.cause = a;
    expect(isPgErrorCode(a, "23505")).toBe(false);
  });
});
