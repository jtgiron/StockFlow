import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../utils/formatters";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-base font-medium text-surface-400"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-lg border bg-surface-900 px-4 py-2.5 text-base text-surface-100",
            "placeholder:text-surface-500 outline-none transition-all duration-150",
            "focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500",
            error ? "border-red-500" : "border-surface-700",
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
