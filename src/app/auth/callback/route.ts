import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * メールのリンクから戻ってきたときの受け口（パスワード再設定）。
 *
 * 認証コードをセッションに交換する。Cookie を書く必要があるため
 * Server Component ではなく Route Handler に置く。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/suggestions";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // 期限切れや使用済みのリンク
    return NextResponse.redirect(`${origin}/reset-password?error=expired`);
  }

  // next は自サイト内の経路に限る（オープンリダイレクトを作らない）
  const target = next.startsWith("/") ? next : "/suggestions";
  return NextResponse.redirect(`${origin}${target}`);
}
