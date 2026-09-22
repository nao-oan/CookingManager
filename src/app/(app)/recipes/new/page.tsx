import { SubBar } from "@/components/app/sub-bar";
import { requireUser } from "@/lib/auth";
import { RecipeForm } from "../recipe-form";

/**
 * R-3 レシピ新規作成 `/recipes/new`
 * 画面定義: docs/design/screen-design.md 5章
 */
export default async function NewRecipePage() {
  await requireUser();

  return (
    <main className="flex flex-col gap-3">
      <SubBar title="新しいレシピ" backHref="/recipes" />
      <RecipeForm />
    </main>
  );
}
