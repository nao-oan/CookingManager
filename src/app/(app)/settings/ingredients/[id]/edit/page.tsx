import { notFound } from "next/navigation";
import { SubBar } from "@/components/app/sub-bar";
import { ingredientThumbnail } from "@/domain/thumbnail/thumbnail";
import { requireUser } from "@/lib/auth";
import { formatDateJa } from "@/lib/date";
import { findIngredientById, findIngredientUsage } from "@/repositories/ingredients";
import { ingredientIdSchema } from "@/validations/ingredient";
import { DeleteIngredientForm } from "./delete-ingredient-form";
import { IngredientEditForm } from "./ingredient-edit-form";

/**
 * C-3 食材編集 `/settings/ingredients/[id]/edit`
 * 画面定義: docs/design/screen-design.md 5章
 */
export default async function IngredientEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = ingredientIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const user = await requireUser();
  const ingredient = await findIngredientById(user.id, parsedId.data);
  if (!ingredient) notFound();

  // 参照されている食材は削除できない（docs/design/database.md 4章）
  const usage = await findIngredientUsage(user.id, ingredient.id);

  return (
    <main className="flex flex-col gap-3.5">
      <SubBar title="食材を編集" backHref="/settings/ingredients" />

      <section className="flex items-center gap-3 rounded-md bg-mint p-4">
        <span
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-md bg-white text-3xl"
        >
          {ingredientThumbnail(ingredient.name)}
        </span>
        <span>
          <span className="rounded-full bg-green-tint px-2.5 py-1 text-xs text-green-dark">
            食材マスタ
          </span>
          <p className="mt-2 font-heading text-2xl font-bold">{ingredient.name}</p>
        </span>
      </section>

      <IngredientEditForm
        ingredient={ingredient}
        registeredOn={formatDateJa(ingredient.createdAt)}
      />

      <DeleteIngredientForm id={ingredient.id} usage={usage} />
    </main>
  );
}
