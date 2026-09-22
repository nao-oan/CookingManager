/**
 * 食事記録のクエリ（F4-1〜F4-4）。
 *
 * ownerId は必ず条件に含める（docs/design/system.md 9.2）。
 * 品目は記録の一部なので、取得も保存も記録単位で扱う。
 */
import "server-only";
import { and, asc, between, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { mealItems, meals } from "@/db/schema";
import { monthBounds } from "@/lib/date";
import type { DateOnly, Meal, MealCalendarDay, MealInput, MealSlot, UUID } from "@/types";

const MEAL_COLUMNS = {
  id: meals.id,
  ownerId: meals.ownerId,
  date: meals.date,
  slot: meals.slot,
  note: meals.note,
};

/**
 * M-1 記録カレンダー。月内の記録の有無を日付ごとに返す（F4-4）。
 * 出典: docs/design/system.md 7.3
 *
 * ドットの色分けに必要なのは日付と区分だけなので、品目は引かない。
 */
export async function getMealCalendar(
  ownerId: UUID,
  year: number,
  month: number,
): Promise<MealCalendarDay[]> {
  const { start, end } = monthBounds(year, month);

  const rows = await db
    .select({ date: meals.date, slot: meals.slot })
    .from(meals)
    .where(and(eq(meals.ownerId, ownerId), between(meals.date, start, end)))
    // slot は列挙型なので、定義順（朝・昼・夕・間食）で並ぶ
    .orderBy(asc(meals.date), asc(meals.slot));

  const days: MealCalendarDay[] = [];
  for (const row of rows) {
    const last = days.at(-1);
    if (last?.date === row.date) last.slots.push(row.slot);
    else days.push({ date: row.date, slots: [row.slot] });
  }

  return days;
}

/**
 * M-2 日別記録。その日の記録を区分順に返す（F4-4）。
 * 出典: docs/design/system.md 7.3
 *
 * 品目は2クエリ目でまとめて引き、記録ごとの N+1 を避ける。
 */
export async function getMealsByDate(ownerId: UUID, date: DateOnly): Promise<Meal[]> {
  const rows = await db
    .select(MEAL_COLUMNS)
    .from(meals)
    .where(and(eq(meals.ownerId, ownerId), eq(meals.date, date)))
    .orderBy(asc(meals.slot));

  if (rows.length === 0) return [];

  const items = await db
    .select({
      id: mealItems.id,
      mealId: mealItems.mealId,
      recipeId: mealItems.recipeId,
      displayName: mealItems.displayName,
      position: mealItems.position,
    })
    .from(mealItems)
    .where(
      inArray(
        mealItems.mealId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(mealItems.position));

  return rows.map((row) => ({
    ...row,
    items: items
      .filter((item) => item.mealId === row.id)
      .map(({ id, recipeId, displayName, position }) => ({
        id,
        recipeId,
        displayName,
        position,
      })),
  }));
}

/**
 * M-3 の編集対象。1日1区分につき1件なので高々1件しか返らない。
 * その日の記録は4件までなので、日付で引いてから絞る
 * （meals_owner_date_slot_key / docs/design/database.md 5.6）。
 */
export async function findMealByDateSlot(
  ownerId: UUID,
  date: DateOnly,
  slot: MealSlot,
): Promise<Meal | null> {
  const found = await getMealsByDate(ownerId, date);
  return found.find((meal) => meal.slot === slot) ?? null;
}

/**
 * 記録を保存する。同じ日付・区分の記録があれば上書きする（F4-1）。
 *
 * 品目は差分更新せず、消してから入れ直す。meal_items の position は
 * 一意制約が DEFERRABLE だが、並べ替えのたびに遅延評価へ依存するのは
 * 追いにくい（docs/design/database.md 5.7）。件数が二桁に収まる規模なので、
 * レシピの材料と同じく入れ替えとして扱う（src/repositories/recipes.ts）。
 */
export async function saveMeal(
  ownerId: UUID,
  date: DateOnly,
  slot: MealSlot,
  input: MealInput,
): Promise<UUID> {
  return db.transaction(async (tx) => {
    const [meal] = await tx
      .insert(meals)
      .values({ ownerId, date, slot, note: input.note })
      .onConflictDoUpdate({
        target: [meals.ownerId, meals.date, meals.slot],
        set: { note: input.note, updatedAt: new Date() },
      })
      .returning({ id: meals.id });

    await tx.delete(mealItems).where(eq(mealItems.mealId, meal.id));
    await tx.insert(mealItems).values(
      input.items.map((item, index) => ({
        mealId: meal.id,
        recipeId: item.recipeId,
        displayName: item.displayName,
        // position は1始まり（docs/design/database.md 5.7）
        position: index + 1,
      })),
    );

    return meal.id;
  });
}

/**
 * 記録を削除する。品目は CASCADE で消える。
 * 削除済みでも成功として返す（docs/design/system.md 8.2 方針5）。
 */
export async function deleteMeal(ownerId: UUID, id: UUID): Promise<void> {
  await db.delete(meals).where(and(eq(meals.ownerId, ownerId), eq(meals.id, id)));
}
