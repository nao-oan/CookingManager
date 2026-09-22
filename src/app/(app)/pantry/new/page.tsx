import { SubBar } from "@/components/app/sub-bar";
import { requireUser } from "@/lib/auth";
import { InventoryForm } from "../inventory-form";

/**
 * P-2 在庫追加 `/pantry/new`
 * 画面定義: docs/design/screen-design.md 5章
 */
export default async function NewInventoryPage() {
  await requireUser();

  return (
    <main className="flex flex-col gap-3">
      <SubBar title="在庫を追加" backHref="/pantry" />
      <InventoryForm />
    </main>
  );
}
