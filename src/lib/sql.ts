/**
 * ILIKE のワイルドカードを打ち消す。
 * 利用者の入力に含まれる %（任意文字列）と _（任意1文字）を文字として扱う。
 * エスケープ文字は ILIKE の既定（バックスラッシュ）を使う。
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** cause を辿る深さの上限。循環参照で回り続けないようにする */
const MAX_CAUSE_DEPTH = 5;

/**
 * Postgres のエラーコード（SQLSTATE）で失敗の種類を判別する。
 *
 * Drizzle は PostgresError を DrizzleQueryError で包んで投げるため、
 * 一番外側の code だけを見ると一意制約違反や外部キー違反を取りこぼす。
 */
export function isPgErrorCode(error: unknown, code: string): boolean {
  let current = error;

  for (
    let depth = 0;
    current !== null && current !== undefined && depth < MAX_CAUSE_DEPTH;
    depth++
  ) {
    if (typeof current !== "object") return false;
    if ((current as { code?: unknown }).code === code) return true;
    current = (current as { cause?: unknown }).cause;
  }

  return false;
}
