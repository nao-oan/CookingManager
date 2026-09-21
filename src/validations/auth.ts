import { z } from "zod";

/**
 * 認証の入力検証（F1-1）。
 * 検証はサーバー側を正とする（docs/design/system.md 8.2 方針2）。
 */

const email = z
  .string()
  .min(1, "メールアドレスを入力してください")
  .email("メールアドレスの形式が正しくありません");

const password = z
  .string()
  .min(1, "パスワードを入力してください")
  .min(8, "パスワードは8文字以上で入力してください");

export const signInSchema = z.object({
  email,
  // ログイン時は文字数を問わない。既存アカウントを弾かないため
  password: z.string().min(1, "パスワードを入力してください"),
});

export const signUpSchema = z
  .object({
    email,
    password,
    passwordConfirm: z.string().min(1, "確認用のパスワードを入力してください"),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "パスワードが一致しません",
    path: ["passwordConfirm"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
