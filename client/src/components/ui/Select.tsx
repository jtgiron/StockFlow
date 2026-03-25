import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../../utils/formatters";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-base font-medium text-surface-400"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full rounded-lg border bg-surface-900 px-4 py-2.5 text-base text-surface-100",
            "outline-none transition-all duration-150",
            "focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500",
            error ? "border-red-500" : "border-surface-700",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" className="text-surface-500">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";
export default Select;
