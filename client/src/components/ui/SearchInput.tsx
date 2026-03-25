import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../utils/formatters";

interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  onClear?: () => void;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    return (
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={ref}
          type="text"
          className={cn(
            "w-full rounded-lg border border-surface-700 bg-surface-900 pl-11 pr-10 py-2.5 text-base text-surface-100",
            "placeholder:text-surface-500 outline-none transition-all duration-150",
            "focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500",
            className,
          )}
          value={value}
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-500 hover:text-surface-300 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
export default SearchInput;
