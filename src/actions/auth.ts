"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
} from "@/validations/auth";
import { fail, toFieldErrors, type ActionResult } from "@/lib/result";

/**
 * 認証の Server Action（F1-1, F1-3）。
 * 出典: docs/design/system.md 7.2
 *
 * 成功時は redirect するため戻り値を返さない。失敗時のみ ActionResult を返す。
 * useActionState から使うため、第1引数に直前の状態を受け取る。
 */

type AuthState = ActionResult<never> | null;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      "入力内容を確認してください",
      toFieldErrors(parsed.error.issues),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // どちらが誤りかは明かさない（総当たりの手がかりを与えない）
    return fail("UNAUTHENTICATED", "メールアドレスまたはパスワードが違います");
  }

  redirect("/suggestions");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      "入力内容を確認してください",
      toFieldErrors(parsed.error.issues),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return fail("INTERNAL_ERROR", "登録できませんでした。時間をおいて試してください");
  }

  // メール確認が有効な場合、identities が空配列なら既に登録済みのアドレス。
  // Supabase は列挙攻撃を防ぐためエラーを返さないので、ここで判別する。
  if (data.user && data.user.identities?.length === 0) {
    return fail("CONFLICT", "このメールアドレスは登録済みです", {
      email: "このメールアドレスは登録済みです",
    });
  }

  // セッションが張られた場合はそのまま本編へ、
  // メール確認待ちの場合はログイン画面へ案内する
  if (data.session) redirect("/suggestions");
  redirect("/login?registered=1");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * パスワード再設定メールを送る（A-3）。
 *
 * アドレスが登録済みかどうかは結果に出さない。存在の有無が分かると
 * アカウントの洗い出しに使えるため、常に同じ文面を返す。
 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      "入力内容を確認してください",
      toFieldErrors(parsed.error.issues),
    );
  }

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password/new`,
  });

  redirect("/reset-password?sent=1");
}

/**
 * 新しいパスワードを設定する（A-4）。
 * メールのリンクで張られた復旧セッションが前提になる。
 */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      "入力内容を確認してください",
      toFieldErrors(parsed.error.issues),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // リンクの有効期限が切れている場合はセッションが無い
  if (!user) {
    return fail("UNAUTHENTICATED", "リンクの有効期限が切れています。もう一度やり直してください");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return fail("INTERNAL_ERROR", "変更できませんでした。時間をおいて試してください");
  }

  redirect("/suggestions");
}
