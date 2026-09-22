import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { ExpiryBadge } from "@/components/app/expiry-badge";
import { describeExpiry } from "@/domain/expiry/expiry";
import { requireUser } from "@/lib/auth";
import { todayInTokyo } from "@/lib/date";
import { listInventory } from "@/repositories/inventory";
import { QuantityStepper } from "./quantity-stepper";

/**
 * P-1 在庫一覧 `/pantry`
 * 画面定義: docs/design/screen-design.md 5章
 *
 * 賞味期限の近い順に並べ、期限の切迫度を色で示す（F5-2, F5-4）。
 * 数量0の在庫は既定で出さないが、数量を戻したり削除したりできるよう
 * `?show=all` で見られるようにする（F5-3）。
 */
export default async function PantryPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const user = await requireUser();
  const includeEmpty = show === "all";
  const today = todayInTokyo();
  const items = await listInventory(user.id, { includeEmpty });

  return (
    <main className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">冷蔵庫</h1>
        <Link
          href={includeEmpty ? "/pantry" : "/pantry?show=all"}
          className="rounded-full bg-white px-3 py-1.5 text-xs text-ink-mid ring-1 ring-line"
        >
          {includeEmpty ? "使い切った分を隠す" : "使い切った分も見る"}
        </Link>
      </div>
      <p className="text-sm text-ink-mid">賞味期限の近い順に表示しています</p>

      {items.length === 0 ? (
        <EmptyState
          title={includeEmpty ? "在庫がありません" : "在庫がまだありません"}
          description="右下の＋から、買ってきた食材を追加できます"
        />
      ) : (
        <section className="flex flex-col gap-2">
          {items.map((item) => {
            // 期限切れはグレーアウトして区別する（F5-5）
            const expired = describeExpiry(item.expiresAt, today).level === "expired";

            return (
              <article
                key={item.id}
                className={`flex flex-col gap-2 rounded-md p-2.5 shadow-sm ${
                  expired ? "bg-mint" : "bg-white"
                }`}
              >
                <Link
                  href={`/pantry/${item.id}/edit`}
                  className="grid grid-cols-[56px_1fr_12px] items-center gap-2.5"
                >
                  <span
                    aria-hidden
                    className={`grid h-14 place-items-center rounded-sm text-2xl ${
                      expired ? "bg-white" : "bg-mint"
                    }`}
                  >
                    🥬
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span
                      className={`font-heading text-lg font-bold ${expired ? "text-ink-mid" : ""}`}
                    >
                      {item.ingredientName}
                    </span>
                    <span className="flex items-center justify-between gap-1.5">
                      <span className="text-[15px] text-ink-mid">
                        {item.quantity} {item.unit}
                      </span>
                      <ExpiryBadge expiresAt={item.expiresAt} today={today} />
                    </span>
                  </span>
                  <span aria-hidden className="text-ink-weak">
                    ›
                  </span>
                </Link>

                <QuantityStepper
                  id={item.id}
                  name={item.ingredientName}
                  quantity={item.quantity}
                  unit={item.unit}
                />

                {expired && (
                  <p className="text-[11px] text-ink-mid">
                    ⓘ 期限切れの食材はレシピの提案から除外されます
                  </p>
                )}
              </article>
            );
          })}
        </section>
      )}

      {/* 追加の FAB。画面幅390pxの右下、下部タブ（84px）と重ならない高さに置く */}
      <Link
        href="/pantry/new"
        aria-label="在庫を追加"
        className="fixed bottom-[100px] left-1/2 ml-[121px] grid size-14 place-items-center rounded-full bg-green text-3xl text-cream shadow-lg"
      >
        ＋
      </Link>
    </main>
  );
}
