import { dimensionOf, type Unit } from "./units";

/**
 * 単位の換算（F6-6）。
 *
 * 計算は基準単位（質量=g、容量=ml）の値で行い、浮動小数点の誤差を避けるため
 * 小数第2位で丸める。表示に戻すときのみ元の単位へ割り戻す。
 */

const MULTIPLIER: Partial<Record<Unit, number>> = {
  kg: 1000,
  L: 1000,
};

/** 小数第2位まで（数量は numeric(10,2) / docs/design/database.md 1章 方針6） */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toBaseUnit(quantity: number, unit: Unit): number {
  return round2(quantity * (MULTIPLIER[unit] ?? 1));
}

export function fromBaseUnit(base: number, unit: Unit): number {
  return round2(base / (MULTIPLIER[unit] ?? 1));
}

/**
 * from の数量を to の単位へ換算する。
 * 次元が異なる場合は換算できないため null を返す（呼び出し側で「数量不明」として扱う）。
 */
export function convert(quantity: number, from: Unit, to: Unit): number | null {
  if (dimensionOf(from) !== dimensionOf(to)) return null;
  return fromBaseUnit(toBaseUnit(quantity, from), to);
}
