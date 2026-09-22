"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/actions/auth";
import { FormError } from "@/components/app/form-error";
import { TextField } from "@/components/app/text-field";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
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

      <button
        type="submit"
        disabled={pending}
        className="min-h-[52px] rounded-lg bg-green font-heading font-bold text-cream disabled:opacity-60"
      >
        {pending ? "送信しています…" : "再設定用のリンクを送る"}
      </button>
    </form>
  );
}
