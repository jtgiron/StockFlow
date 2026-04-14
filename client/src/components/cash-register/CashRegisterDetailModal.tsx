import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { formatCurrency, formatTime } from "../../utils/formatters";
import Modal from "../ui/Modal";
import Table from "../ui/Table";
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
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

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
