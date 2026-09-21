/** フィールド単位のエラー表示（docs/design/system.md 8.1） */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-danger">{message}</p>;
}
