import { ErrorMessage } from "./ErrorMessage";

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  autoComplete?: string;
}

export function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  required = false,
  error = null,
  autoComplete = "off",
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-cyan-100">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
        autoComplete={autoComplete}
        className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-cyan-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      />
      <ErrorMessage id={`${id}-error`} message={error} />
    </div>
  );
}
