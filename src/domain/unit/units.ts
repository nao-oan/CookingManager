/**
 * 単位の定義と次元。
 *
 * 出典: docs/design/system.md 5.1、docs/design/database.md 3章
 * 質量・容量のみ換算し、可算単位は同一単位同士でしか比較しない（F6-6）。
 */

export const UNITS = [
  "g",
  "kg",
  "ml",
  "L",
  "個",
  "袋",
  "パック",
  "本",
  "束",
  "枚",
  "缶",
  "箱",
] as const;

export type Unit = (typeof UNITS)[number];

/** 質量は g、容量は ml を基準とする。可算単位は単位ごとに独立した次元として扱う */
export type Dimension = "mass" | "volume" | `count:${Unit}`;

export function dimensionOf(unit: Unit): Dimension {
  if (unit === "g" || unit === "kg") return "mass";
  if (unit === "ml" || unit === "L") return "volume";
  return `count:${unit}`;
}

/** 比較できる組み合わせかどうか。次元が一致すれば比較できる */
export function isComparable(a: Unit, b: Unit): boolean {
  return dimensionOf(a) === dimensionOf(b);
}
