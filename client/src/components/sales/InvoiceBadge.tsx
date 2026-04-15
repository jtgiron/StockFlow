import type { InvoiceStatus } from "../../types";
import Badge from "../ui/Badge";

interface Props {
  status: InvoiceStatus | null | undefined;
  cae?: string | null;
  invoiceNumber?: number | null;
  caeExpiry?: string | null;
  onRetry?: () => void;
  isAdmin?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "success" | "danger" | "warning" } | null
> = {
  success: { label: "Facturado", variant: "success" },
  failed: { label: "Factura pendiente", variant: "danger" },
  pending: { label: "Facturando...", variant: "warning" },
  disabled: null,
};

export default function InvoiceBadge({
  status,
  cae,
  invoiceNumber,
  caeExpiry,
  onRetry,
  isAdmin,
}: Props) {
  if (!status || status === "disabled") return null;

  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;

  return (
    <div className="space-y-1">
      <Badge variant={cfg.variant}>{cfg.label}</Badge>
      {status === "success" && cae && (
        <div className="text-xs text-surface-400 space-y-0.5">
          <div>CAE: {cae}</div>
          {invoiceNumber != null && (
            <div>Nro {String(invoiceNumber).padStart(8, "0")}</div>
          )}
          {caeExpiry && (
            <div>
              Vence: {new Date(caeExpiry + "T12:00:00").toLocaleDateString("es-AR")}
            </div>
          )}
        </div>
      )}
      {status === "failed" && isAdmin && onRetry && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="text-xs text-red-400 underline hover:text-red-300"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
