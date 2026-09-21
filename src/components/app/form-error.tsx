/** フォーム全体のエラー表示 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}
