import { notFound } from "next/navigation";
import { MEAL_SLOT_LABELS } from "@/components/app/meal-slot";
import { SubBar } from "@/components/app/sub-bar";
import { requireUser } from "@/lib/auth";
import { formatDayJa, isValidDateOnly } from "@/lib/date";
import { findMealByDateSlot } from "@/repositories/meals";
import { findRecipesByIds } from "@/repositories/recipes";
import { mealSlotSchema } from "@/validations/meal";
import { recipeIdSchema } from "@/validations/recipe";
import { DeleteMealForm } from "./delete-meal-form";
import { MealForm } from "./meal-form";

/**
 * M-3 食事記録の追加・編集 `/meals/[date]/[slot]/edit`
 * 画面定義: docs/design/screen-design.md 5章
 *
 * R-2 から `?recipeId=` 付きで来たときは、そのレシピを品目に入れた状態で開き、
 * 保存後は R-2 へ戻す（3タップ以内で記録を終える / NFR-9）。
 */
export default async function EditMealPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string; slot: string }>;
  searchParams: Promise<{ recipeId?: string }>;
}) {
  const [{ date, slot }, { recipeId }] = await Promise.all([params, searchParams]);

  if (!isValidDateOnly(date)) notFound();
  const parsedSlot = mealSlotSchema.safeParse(slot);
  if (!parsedSlot.success) notFound();

  const user = await requireUser();
  const meal = await findMealByDateSlot(user.id, date, parsedSlot.data);

  // クエリのレシピは自分のものだけを既定に入れる（F1-2）
  const parsedRecipeId = recipeIdSchema.safeParse(recipeId);
  const preset = parsedRecipeId.success
    ? ((await findRecipesByIds(user.id, [parsedRecipeId.data]))[0] ?? null)
    : null;

  const label = MEAL_SLOT_LABELS[parsedSlot.data];

  return (
    <main className="flex flex-col gap-3">
      <SubBar title={`${label}の記録`} backHref={`/meals/${date}`} />
      <p className="-mt-2 text-center text-sm text-ink-mid">{formatDayJa(date)}</p>

      <MealForm
        date={date}
        slot={parsedSlot.data}
        meal={meal}
        preset={preset}
        // 戻り先は ID だけを渡す。URL を画面から受け取らない
        fromRecipeId={preset?.id ?? null}
      />

      {meal && <DeleteMealForm id={meal.id} date={date} slot={parsedSlot.data} />}
    </main>
  );
}
