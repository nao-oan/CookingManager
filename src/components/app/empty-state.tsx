/** 空状態（F6-7）。一覧が0件のときに何をすればよいかを示す */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-md bg-mint px-4 py-8 text-center">
      <p className="font-heading font-bold">{title}</p>
      {description && <p className="text-sm text-ink-mid">{description}</p>}
    </div>
  );
}
