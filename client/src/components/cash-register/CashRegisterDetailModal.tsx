import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency, formatTime } from "../../utils/formatters";
import Modal from "../ui/Modal";
import Table from "../ui/Table";
import InvoiceBadge from "../sales/InvoiceBadge";
import type { Sale, PaymentMethod } from "../../types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  mercadopago: "Mercado Pago",
  credit: "Fiado",
};

interface Props {
  cashRegisterId: number | null;
  open: boolean;
  onClose: () => void;
}

export default function CashRegisterDetailModal({
  cashRegisterId,
  open,
  onClose,
}: Props) {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleRetryInvoice(saleId: number) {
    try {
      const result = await api.post<{
        invoice_status: string;
        invoice_cae: string;
        invoice_number: number;
      }>(`/sales/${saleId}/retry-invoice`, {});
      toast.success("Factura emitida correctamente");
      setSales((prev) =>
        prev.map((s) =>
          s.id === saleId
            ? {
                ...s,
                invoice_status: "success" as const,
                invoice_cae: result.invoice_cae,
                invoice_number: result.invoice_number,
              }
            : s,
        ),
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al reintentar factura";
      toast.error(msg);
    }
  }

  useEffect(() => {
    if (!open || !cashRegisterId) return;
    setLoading(true);
    api
      .get<{ items: Sale[] }>(
        `/sales?cash_register_id=${cashRegisterId}&limit=200`,
      )
      .then((data) => setSales(data.items))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, [open, cashRegisterId]);

  const columns = [
    {
      header: "Hora",
      accessor: (s: Sale) => formatTime(s.created_at),
      className: "w-20",
    },
    {
      header: "Productos",
      accessor: (s: Sale) => {
        if (!s.sale_items?.length) return "—";
        return s.sale_items
          .map((si) => {
            const name = si.product?.name ?? `#${si.product_id}`;
            return `${name} ×${si.quantity}`;
          })
          .join(", ");
      },
    },
    {
      header: "Total",
      accessor: (s: Sale) => formatCurrency(Number(s.total_amount)),
      className: "text-right w-28",
    },
    {
      header: "Pago",
      accessor: (s: Sale) => {
        if (!s.sale_payments?.length) return "—";
        return s.sale_payments
          .map(
            (p) =>
              PAYMENT_LABELS[p.payment_method as PaymentMethod] ??
              p.payment_method,
          )
          .join(", ");
      },
      className: "w-32",
    },
    {
      header: "Factura",
      accessor: (s: Sale) => (
        <InvoiceBadge
          status={s.invoice_status}
          cae={s.invoice_cae}
          invoiceNumber={s.invoice_number}
          caeExpiry={s.invoice_cae_expiry}
          isAdmin={isAdmin}
          onRetry={() => handleRetryInvoice(s.id)}
        />
      ),
      className: "w-40",
    },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Ventas del turno" size="xl">
      <Table
        columns={columns}
        data={sales}
        keyExtractor={(s) => s.id}
        loading={loading}
        emptyMessage="No hubo ventas en este turno"
      />
    </Modal>
  );
}
