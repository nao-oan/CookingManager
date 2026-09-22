import { notFound } from "next/navigation";
import { ExpiryBadge } from "@/components/app/expiry-badge";
import { SubBar } from "@/components/app/sub-bar";
import { requireUser } from "@/lib/auth";
import { todayInTokyo } from "@/lib/date";
import { findInventoryItemById } from "@/repositories/inventory";
import { inventoryIdSchema } from "@/validations/inventory";
import { InventoryForm } from "../../inventory-form";
import { DeleteInventoryForm } from "./delete-inventory-form";

/**
 * P-3 在庫編集 `/pantry/[id]/edit`
 * 画面定義: docs/design/screen-design.md 5章
 */
export default async function EditInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = inventoryIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const user = await requireUser();
  const item = await findInventoryItemById(user.id, parsedId.data);
  if (!item) notFound();

  return (
    <main className="flex flex-col gap-3">
      <SubBar title="在庫を編集" backHref="/pantry" />

      <section className="flex items-center gap-3 rounded-md bg-mint p-4">
        <span aria-hidden className="grid size-16 place-items-center rounded-sm bg-white text-3xl">
          🥬
        </span>
        <span className="flex flex-col gap-1.5">
          <span className="font-heading text-xl font-bold">{item.ingredientName}</span>
          <ExpiryBadge expiresAt={item.expiresAt} today={todayInTokyo()} />
        </span>
      </section>

      <InventoryForm item={item} />
      <DeleteInventoryForm id={item.id} />
    </main>
  );
}
