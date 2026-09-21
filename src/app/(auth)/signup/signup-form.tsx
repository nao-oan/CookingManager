"use client";

import { useActionState } from "react";
import { signUp } from "@/actions/auth";
import { TextField } from "@/components/app/text-field";
import { FormError } from "@/components/app/form-error";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, null);
  const fields = state && !state.ok ? state.error.fields : undefined;
  const formError = state && !state.ok && !state.error.fields ? state.error.message : undefined;

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg bg-white p-5 shadow-sm">
      <FormError message={formError} />

      <TextField
        label="メールアドレス"
        name="email"
        type="email"
        placeholder="name@example.com"
        autoComplete="email"
        error={fields?.email}
      />
      <TextField
        label="パスワード"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="8文字以上で入力してください"
        error={fields?.password}
      />
      <TextField
        label="パスワード（確認）"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        error={fields?.passwordConfirm}
      />

      <button
        type="submit"
        disabled={pending}
        className="min-h-[52px] rounded-lg bg-green font-heading font-bold text-cream disabled:opacity-60"
      >
        {pending ? "登録しています…" : "アカウントを作成"}
      </button>
    </form>
  );
}
