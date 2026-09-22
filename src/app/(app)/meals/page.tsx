import Link from "next/link";
import { MealSlotDot, MEAL_SLOT_ICONS, MEAL_SLOT_LABELS } from "@/components/app/meal-slot";
import { requireUser } from "@/lib/auth";
import {
  WEEK_HEADERS,
  dayOfMonth,
  formatDayJa,
  formatMonthJa,
  monthGrid,
  shiftMonth,
  todayInTokyo,
} from "@/lib/date";
import { getMealCalendar, getMealsByDate } from "@/repositories/meals";
import { MEAL_SLOTS, type DateOnly } from "@/types";

/**
 * M-1 記録カレンダー `/meals`
 * 画面定義: docs/design/screen-design.md 5章
 *
 * 表示する月は URL に持たせ、JS なしでも前後の月をたどれるようにする。
 * サマリは当日ぶんを出す（どの月を見ていても「今日の記録」を続けられる）。
 */
export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const { y, m } = await searchParams;
  const user = await requireUser();

  const today = todayInTokyo();
  const { year, month } = readMonth(y, m, today);

  const [calendar, todayMeals] = await Promise.all([
    getMealCalendar(user.id, year, month),
    getMealsByDate(user.id, today),
  ]);

  const slotsByDate = new Map(calendar.map((day) => [day.date, day.slots]));
  const itemsBySlot = new Map(todayMeals.map((meal) => [meal.slot, meal.items]));

  const previous = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  return (
    <main className="flex flex-col gap-3">
      <div>
        <h1 className="font-heading text-2xl font-bold">食事の記録</h1>
        <p className="text-sm text-ink-mid">毎日の食事を記録して、献立の振り返りに使えます。</p>
      </div>

      <nav className="grid grid-cols-[40px_1fr_40px] items-center gap-3">
        <MonthLink month={previous} label="前の月" mark="‹" />
        <span className="text-center font-heading text-xl font-bold">
          {formatMonthJa(year, month)}
        </span>
        <MonthLink month={next} label="次の月" mark="›" />
      </nav>

      <section className="rounded-md bg-white p-3 shadow-sm">
        <div className="grid grid-cols-7 text-center text-xs text-ink-mid">
          {WEEK_HEADERS.map((header) => (
            <span key={header}>{header}</span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-y-2">
          {monthGrid(year, month).map((date, index) =>
            date === null ? (
              // 1日より前の空きコマ。曜日の位置を合わせるためだけに置く
              <span key={`blank-${index}`} />
            ) : (
              <Link
                key={date}
                href={`/meals/${date}`}
                aria-label={`${formatDayJa(date)}の記録`}
                className="flex min-h-[43px] flex-col items-center gap-1 text-sm"
              >
                <span
                  className={
                    date === today
                      ? "grid size-7 place-items-center rounded-full bg-green font-bold text-cream"
                      : "grid size-7 place-items-center"
                  }
                >
                  {dayOfMonth(date)}
                </span>
                <span className="flex h-1.5 gap-0.5">
                  {(slotsByDate.get(date) ?? []).map((slot) => (
                    <MealSlotDot key={slot} slot={slot} />
                  ))}
                </span>
              </Link>
            ),
          )}
        </div>

        <ul className="mt-3 flex justify-between text-[10px] text-ink-mid">
          {MEAL_SLOTS.map((slot) => (
            <li key={slot} className="flex items-center gap-1">
              <MealSlotDot slot={slot} />
              {MEAL_SLOT_LABELS[slot]}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col rounded-md bg-white p-3 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{formatDayJa(today)}</h2>
          <Link href={`/meals/${today}`} className="text-xs text-green-dark underline">
            この日の記録を見る
          </Link>
        </div>

        {/* 区切り線を行の間だけに引くため、見出しとは別の入れ物に並べる */}
        <div className="flex flex-col">
          {MEAL_SLOTS.map((slot) => {
            const items = itemsBySlot.get(slot) ?? [];
            return (
              <Link
                key={slot}
                href={`/meals/${today}/${slot}/edit`}
                className="grid min-h-[46px] grid-cols-[84px_1fr_20px] items-center gap-2 border-t border-dashed border-line py-1.5 text-sm first:border-t-0"
              >
                <span className="font-bold">
                  {MEAL_SLOT_ICONS[slot]} {MEAL_SLOT_LABELS[slot]}
                </span>
                {items.length === 0 ? (
                  <span className="text-ink-weak">未記録</span>
                ) : (
                  <span className="truncate">
                    {items.map((item) => item.displayName).join("・")}
                  </span>
                )}
                <span aria-hidden className="text-right text-ink-mid">
                  {items.length === 0 ? "＋" : "›"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function MonthLink({
  month,
  label,
  mark,
}: {
  month: { year: number; month: number };
  label: string;
  mark: string;
}) {
  return (
    <Link
      href={`/meals?y=${month.year}&m=${month.month}`}
      aria-label={label}
      className="grid size-10 place-items-center rounded-full bg-mint text-2xl text-green"
    >
      {mark}
    </Link>
  );
}

/**
 * クエリの年月を読む。範囲外や数値でない値は当月に倒す。
 * 画面から来た値をそのまま日付計算に渡さないため。
 */
function readMonth(y: string | undefined, m: string | undefined, today: DateOnly) {
  const fallback = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const year = Number(y);
  const month = Number(m);

  if (!Number.isInteger(year) || year < 1970 || year > 2999) return fallback;
  if (!Number.isInteger(month) || month < 1 || month > 12) return fallback;

  return { year, month };
}
