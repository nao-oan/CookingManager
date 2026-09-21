import { describe, expect, it } from "vitest";
import { convert, fromBaseUnit, toBaseUnit } from "./convert";
import { dimensionOf, isComparable } from "./units";

describe("dimensionOf", () => {
  it("質量の単位は mass になる", () => {
    expect(dimensionOf("g")).toBe("mass");
    expect(dimensionOf("kg")).toBe("mass");
  });

  it("容量の単位は volume になる", () => {
    expect(dimensionOf("ml")).toBe("volume");
    expect(dimensionOf("L")).toBe("volume");
  });

  it("可算単位は単位ごとに独立した次元になる", () => {
    expect(dimensionOf("個")).toBe("count:個");
    expect(dimensionOf("袋")).toBe("count:袋");
  });
});

describe("isComparable", () => {
  it("同じ次元なら比較できる", () => {
    expect(isComparable("g", "kg")).toBe(true);
    expect(isComparable("ml", "L")).toBe(true);
    expect(isComparable("個", "個")).toBe(true);
  });

  it("異なる可算単位どうしは比較できない", () => {
    expect(isComparable("個", "袋")).toBe(false);
  });

  it("可算単位と質量は比較できない（F6-6）", () => {
    expect(isComparable("個", "g")).toBe(false);
  });
});

describe("toBaseUnit / fromBaseUnit", () => {
  it("kg を g に直す", () => {
    expect(toBaseUnit(1.5, "kg")).toBe(1500);
  });

  it("L を ml に直す", () => {
    expect(toBaseUnit(0.5, "L")).toBe(500);
  });

  it("基準単位はそのまま", () => {
    expect(toBaseUnit(300, "g")).toBe(300);
    expect(toBaseUnit(2, "個")).toBe(2);
  });

  it("基準単位から元の単位へ戻す", () => {
    expect(fromBaseUnit(1500, "kg")).toBe(1.5);
    expect(fromBaseUnit(300, "g")).toBe(300);
  });
});

describe("convert", () => {
  it("質量どうしを換算する", () => {
    expect(convert(0.3, "kg", "g")).toBe(300);
    expect(convert(250, "g", "kg")).toBe(0.25);
  });

  it("容量どうしを換算する", () => {
    expect(convert(1200, "ml", "L")).toBe(1.2);
  });

  it("換算できない組み合わせは null を返す（F6-6）", () => {
    expect(convert(2, "個", "g")).toBeNull();
    expect(convert(1, "袋", "本")).toBeNull();
  });

  it("浮動小数点の誤差を持ち越さない", () => {
    // 0.1 + 0.2 のような誤差が数量に現れないこと
    expect(convert(0.07, "kg", "g")).toBe(70);
  });
});
