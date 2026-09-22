import { createClient } from "@/lib/supabase/server";
import { searchIngredientsByName } from "@/repositories/ingredients";
import { searchQuerySchema } from "@/validations/ingredient";

/**
 * GET /api/ingredients/search?q= 食材名の部分一致検索（F2-2, F2-3）。
 * 出典: docs/design/system.md 7.4
 *
 * 入力中に逐次呼ぶため Route Handler に置く。同名の食材も候補として返し、
 * 画面側で重複作成を防ぐ。
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 画面と違いリダイレクトはできないので 401 を返す（docs/design/system.md 8.1）
  if (!user) {
    return Response.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "ログインしてください" } },
      { status: 401 },
    );
  }

  const query = searchQuerySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");

  if (!query.success) {
    return Response.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "検索語が長すぎます" } },
      { status: 400 },
    );
  }

  const found = await searchIngredientsByName(user.id, query.data);

  return Response.json({
    ok: true,
    data: found.map(({ id, name, defaultUnit, isStaple }) => ({
      id,
      name,
      defaultUnit,
      isStaple,
    })),
  });
}
