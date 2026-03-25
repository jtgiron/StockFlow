import { type ReactNode } from "react";
import { cn } from "../../utils/formatters";

interface Column<T> {
  header: string;
  accessor: (item: T, index: number) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  loading?: boolean;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No hay datos",
  loading,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-surface-400 text-base">
        <svg
          className="animate-spin h-7 w-7 mr-3"
          viewBox="0 0 24 24"
          fill="none"
        >
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
        Cargando...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-800">
      <table className="w-full text-base">
        <thead>
          <tr className="border-b border-surface-800 bg-surface-900">
            {columns.map((col, ci) => (
              <th
                key={ci}
                className={cn(
                  "px-4 py-3 text-left font-medium text-surface-500 text-sm uppercase tracking-wider",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-surface-500 text-base"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={keyExtractor(item, rowIdx)}
                className="border-b border-surface-800/50 hover:bg-surface-800/25 transition-colors duration-100 last:border-0"
              >
                {columns.map((col, ci) => (
                  <td
                    key={ci}
                    className={cn("px-4 py-3 text-surface-200", col.className)}
                  >
                    {col.accessor(item, rowIdx)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
