import { type ReactNode } from "react";
import { cn } from "../../utils/formatters";

type CardAccent = "amber" | "teal" | "red" | "blue" | "slate";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  accent?: CardAccent;
}

const accentBarColors: Record<CardAccent, string> = {
  amber: "bg-amber-500",
  teal: "bg-teal-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  slate: "bg-surface-600",
};

export default function Card({
  children,
  className,
  padding = true,
  accent,
}: CardProps) {
  if (accent) {
    return (
      <div
        className={cn(
          "rounded-xl border border-surface-800 bg-surface-900/80 backdrop-blur-sm overflow-hidden",
          className,
        )}
      >
        <div className={cn("h-0.5", accentBarColors[accent])} />
        <div className={cn(padding && "p-6")}>{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-surface-800 bg-surface-900/80 backdrop-blur-sm",
        padding && "p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-surface-50">{title}</h3>
        {description && (
          <p className="text-base text-surface-400 mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
