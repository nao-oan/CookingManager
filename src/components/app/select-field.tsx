import { FieldError } from "./field-error";

/** ラベル付きの選択欄。画面設計書の .input--select に対応する */
export function SelectField({
  label,
  name,
  options,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-bold">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="min-h-[48px] rounded-sm border border-line bg-white px-3.5 text-[15px] text-ink"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span id={`${name}-error`}>
        <FieldError message={error} />
      </span>
    </div>
  );
}
