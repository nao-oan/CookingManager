import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MEAL_SLOT_ACCENT,
  MEAL_SLOT_ICONS,
  MEAL_SLOT_LABELS,
  MEAL_SLOT_SECTION,
} from "@/components/app/meal-slot";
import { SubBar } from "@/components/app/sub-bar";
import { requireUser } from "@/lib/auth";
import {
  addDays,
  dayOfMonth,
  formatDayJa,
  isValidDateOnly,
  startOfWeek,
  weekdayJa,
} from "@/lib/date";
import { getMealsByDate } from "@/repositories/meals";
import { MEAL_SLOTS, type DateOnly, type MealItem, type MealSlot } from "@/types";

/**
 * M-2 日別記録 `/meals/[date]`
 * 画面定義: docs/design/screen-design.md 5章
 *
 * 4区分を必ず並べ、記録のない区分は空状態にする（F4-4）。
 * レシピ由来の品目はバッジを付けて R-2 へ繋ぐ（F4-2）。
 */
export default async function MealDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDateOnly(date)) notFound();

  const user = await requireUser();
  const meals = await getMealsByDate(user.id, date);
  const itemsBySlot = new Map(meals.map((meal) => [meal.slot, meal.items]));

  const weekStart = startOfWeek(date);

  return (
    <main className="flex flex-col gap-3">
      <SubBar title={formatDayJa(date)} backHref="/meals" />

      <nav aria-label="週の日付" className="grid grid-cols-7 gap-1 text-center text-xs">
        {Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).map((day) => (
          <Link key={day} href={`/meals/${day}`} className="flex flex-col items-center gap-1">
            <span className={day === date ? "text-green" : "text-ink-mid"}>{weekdayJa(day)}</span>
            <span
              className={
                day === date
                  ? "grid size-9 place-items-center rounded-full bg-green text-base text-cream"
                  : "grid size-9 place-items-center text-base"
              }
            >
              {dayOfMonth(day)}
            </span>
          </Link>
        ))}
      </nav>

      {MEAL_SLOTS.map((slot) => (
        <MealSection key={slot} date={date} slot={slot} items={itemsBySlot.get(slot) ?? []} />
      ))}
    </main>
  );
}

function MealSection({ date, slot, items }: { date: DateOnly; slot: MealSlot; items: MealItem[] }) {
  const label = MEAL_SLOT_LABELS[slot];
  const editHref = `/meals/${date}/${slot}/edit`;

  return (
    <section className={`flex flex-col gap-1.5 rounded-md p-2.5 ${MEAL_SLOT_SECTION[slot]}`}>
      <div className="flex items-center justify-between px-1">
        <h2 className="font-heading text-xl font-bold">
          {MEAL_SLOT_ICONS[slot]} {label}
        </h2>
        <Link
          href={editHref}
          aria-label={`${label}を${items.length === 0 ? "追加" : "編集"}`}
          className={`grid size-9 place-items-center rounded-full text-2xl text-white ${MEAL_SLOT_ACCENT[slot]}`}
        >
          {items.length === 0 ? "＋" : "✎"}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-sm bg-white p-3 text-center">
          <p className="text-sm text-ink-mid">まだ記録がありません</p>
          <Link
            href={editHref}
            className="mx-auto mt-2 grid min-h-[38px] max-w-[220px] place-items-center rounded-lg bg-green text-sm font-bold text-cream"
          >
            ＋ {label}を追加
          </Link>
        </div>
      ) : (
        items.map((item) => <MealItemCard key={item.id} item={item} editHref={editHref} />)
      )}
    </section>
  );
}

/**
 * 品目カード。レシピ由来なら R-2 へ、自由入力なら編集画面へ繋ぐ
 * （recipe_id の有無で判定する / docs/design/database.md 5.7）。
 */
function MealItemCard({ item, editHref }: { item: MealItem; editHref: string }) {
  const href = item.recipeId ? `/recipes/${item.recipeId}` : editHref;

  return (
    <Link
      href={href}
      className="flex min-h-[56px] items-center gap-2.5 rounded-sm bg-white px-2.5 py-1.5"
    >
      <span aria-hidden className="grid h-12 w-16 place-items-center rounded-sm bg-mint text-2xl">
        🍽️
      </span>
      <span className="flex-1 text-sm leading-snug font-bold">{item.displayName}</span>
      {item.recipeId && (
        <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] text-green-dark">レシピ</span>
      )}
      <span aria-hidden className="text-ink-mid">
        {item.recipeId ? "›" : "✎"}
      </span>
    </Link>
  );
}
