import { FieldError } from "./field-error";

/** ラベル付きの入力欄。画面設計書の .field / .input に対応する */
export function TextField({
  label,
  name,
  type = "text",
  placeholder,
  hint,
  error,
  defaultValue,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="min-h-[48px] rounded-sm border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-ink-weak"
      />
      {hint && !error && <p className="text-xs text-ink-mid">{hint}</p>}
      <span id={`${name}-error`}>
        <FieldError message={error} />
      </span>
    </div>
  );
}
