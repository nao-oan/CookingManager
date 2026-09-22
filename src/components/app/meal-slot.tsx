import type { MealSlot } from "@/types";

/**
 * 食事区分の表示（M-1・M-2・M-3 で共通）。
 *
 * 文言と色を3画面に散らすと、片方だけ直したときに食い違う。
 * 値はモックアップ m-1／m-2 とデザイントークンから取る。
 */

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

export const MEAL_SLOT_ICONS: Record<MealSlot, string> = {
  breakfast: "☀️",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🧁",
};

/** カレンダーのドット（画面設計 M-1: 朝＝緑・昼＝黄・夕＝赤）。間食は指定がないため無彩色に寄せる */
const DOT_COLORS: Record<MealSlot, string> = {
  breakfast: "bg-green-soft",
  lunch: "bg-warn",
  dinner: "bg-danger",
  snack: "bg-ink-weak",
};

/** M-2 の区分セクションの背景（モックアップ m-2） */
export const MEAL_SLOT_SECTION: Record<MealSlot, string> = {
  breakfast: "bg-danger-bg",
  lunch: "bg-warn-bg",
  dinner: "bg-mint",
  snack: "bg-danger-bg",
};

/** 同じくセクション内の追加ボタン */
export const MEAL_SLOT_ACCENT: Record<MealSlot, string> = {
  breakfast: "bg-danger",
  lunch: "bg-warn",
  dinner: "bg-green",
  snack: "bg-danger",
};

/** 記録の有無を示すドット（F4-4） */
export function MealSlotDot({ slot }: { slot: MealSlot }) {
  return (
    <i
      aria-hidden
      className={`block size-1.5 rounded-full ${DOT_COLORS[slot]}`}
      title={MEAL_SLOT_LABELS[slot]}
    />
  );
}
