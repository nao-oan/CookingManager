import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * セッションから所有者IDを取得する（F1-2）。
 * クライアントから渡された ownerId は信用せず、常にここから取る
 * （docs/design/system.md 9.2）。
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return user;
}
