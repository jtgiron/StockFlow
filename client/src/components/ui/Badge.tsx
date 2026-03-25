import { type ReactNode } from "react";
import { cn } from "../../utils/formatters";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-800 text-surface-300 border-surface-700",
  success: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  danger: "bg-red-500/15 text-red-400 border-red-500/30",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export default function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
