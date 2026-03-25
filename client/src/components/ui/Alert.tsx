import { type ReactNode } from "react";
import { cn } from "../../utils/formatters";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

const variantStyles: Record<AlertVariant, string> = {
  info: "bg-blue-500/10 border-blue-500/30 text-blue-300",
  success: "bg-teal-500/10 border-teal-500/30 text-teal-300",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  error: "bg-red-500/10 border-red-500/30 text-red-300",
};

const icons: Record<AlertVariant, string> = {
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  warning:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  error: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
};

export default function Alert({
  variant = "info",
  children,
  className,
  onClose,
}: AlertProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3.5 text-base",
        variantStyles[variant],
        className,
      )}
    >
      <svg
        className="w-6 h-6 shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[variant]} />
      </svg>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 p-0.5 hover:opacity-70 transition-opacity"
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
}
