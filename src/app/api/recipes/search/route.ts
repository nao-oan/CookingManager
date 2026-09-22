import { createClient } from "@/lib/supabase/server";
import { searchRecipesByName } from "@/repositories/recipes";
import { recipeSearchQuerySchema } from "@/validations/recipe";

/**
 * GET /api/recipes/search?q= 料理名の部分一致検索（F4-2）。
 * 出典: docs/design/system.md 7.4
 *
 * M-3 の品目選択で入力中に逐次呼ぶため Route Handler に置く。
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

  const query = recipeSearchQuerySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");

  if (!query.success) {
    return Response.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "検索語が長すぎます" } },
      { status: 400 },
    );
  }

  const found = await searchRecipesByName(user.id, query.data);

  return Response.json({
    ok: true,
    data: found.map(({ id, name }) => ({ id, name })),
  });
}
