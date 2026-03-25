import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/formatters";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-amber-500 text-surface-950 hover:bg-amber-400 active:bg-amber-600 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30",
  secondary:
    "bg-surface-800 text-surface-200 hover:bg-surface-700 border border-surface-700 hover:border-surface-600",
  danger:
    "bg-red-600 text-white hover:bg-red-500 active:bg-red-700 shadow-sm shadow-red-900/30",
  ghost:
    "bg-transparent text-surface-400 hover:text-surface-200 hover:bg-surface-800",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-base",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  loading,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
