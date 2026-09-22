/**
 * 切り替えトグル。画面設計書の .toggle に対応する（C-3 の常備食材）。
 * チェックボックスを隠して見た目だけ差し替えるので、JS なしでも動く。
 */
export function ToggleField({
  label,
  name,
  hint,
  defaultChecked,
}: {
  label: string;
  name: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-2.5">
      <span>
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="mt-1 block text-xs text-ink-mid">{hint}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-green peer-checked:*:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green"
      >
        <span className="absolute top-1 left-1 size-5 rounded-full bg-white transition-transform" />
      </span>
    </label>
  );
}
