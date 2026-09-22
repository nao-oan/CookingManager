"use client";

import { useActionState } from "react";
import { updatePassword } from "@/actions/auth";
import { FormError } from "@/components/app/form-error";
import { TextField } from "@/components/app/text-field";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  const fields = state && !state.ok ? state.error.fields : undefined;
  const formError = state && !state.ok && !state.error.fields ? state.error.message : undefined;

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg bg-white p-5 shadow-sm">
      <FormError message={formError} />

      <TextField
        label="新しいパスワード"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="8文字以上で入力してください"
        error={fields?.password}
      />
      <TextField
        label="新しいパスワード（確認）"
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
        {pending ? "変更しています…" : "パスワードを変更する"}
      </button>
    </form>
  );
}
