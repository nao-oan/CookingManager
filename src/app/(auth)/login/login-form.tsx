"use client";

import { useActionState } from "react";
import { signIn } from "@/actions/auth";
import { TextField } from "@/components/app/text-field";
import { FormError } from "@/components/app/form-error";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  const fields = state && !state.ok ? state.error.fields : undefined;
  // フィールド単位のエラーは各欄に出すので、全体表示は重複させない
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
        autoComplete="current-password"
        error={fields?.password}
      />

      <button
        type="submit"
        disabled={pending}
        className="min-h-[52px] rounded-lg bg-green font-heading font-bold text-cream disabled:opacity-60"
      >
        {pending ? "ログインしています…" : "ログイン"}
      </button>
    </form>
  );
}
