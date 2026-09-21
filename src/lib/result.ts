/**
 * Server Action の戻り値。
 * 出典: docs/design/system.md 4.3
 *
 * ドメイン層とリポジトリは例外を投げず、値で結果を返す。
 * Server Action がこの型に詰め、画面はこれだけを見る。
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export interface AppError {
  code: ErrorCode;
  message: string;
  /** フォームのフィールド単位のエラー。キーはフィールド名 */
  fields?: Record<string, string>;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, error: { code, message, ...(fields ? { fields } : {}) } };
}
