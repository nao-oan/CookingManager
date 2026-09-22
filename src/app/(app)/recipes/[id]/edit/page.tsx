import { notFound } from "next/navigation";
import { SubBar } from "@/components/app/sub-bar";
import { requireUser } from "@/lib/auth";
import { findRecipeById } from "@/repositories/recipes";
import { recipeIdSchema } from "@/validations/recipe";
import { RecipeForm } from "../../recipe-form";
import { DeleteRecipeForm } from "./delete-recipe-form";

/**
 * R-4 レシピ編集 `/recipes/[id]/edit`
 * 画面定義: docs/design/screen-design.md 5章
 */
export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = recipeIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const user = await requireUser();
  const recipe = await findRecipeById(user.id, parsedId.data);
  if (!recipe) notFound();

  return (
    <main className="flex flex-col gap-3">
      <SubBar title="レシピを編集" backHref="/recipes" />
      <RecipeForm recipe={recipe} />
      <DeleteRecipeForm id={recipe.id} />
    </main>
  );
}
