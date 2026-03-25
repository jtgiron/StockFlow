import { useState, type FormEvent } from "react";
import { useCart } from "../../contexts/CartContext";
import { formatCurrency } from "../../utils/formatters";
import type { PaymentMethod, CreditAccount } from "../../types";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

interface PaymentModalProps {
  creditAccounts: CreditAccount[];
  onConfirm: (creditAccountId?: number) => Promise<void>;
  onClose: () => void;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "qr", label: "QR" },
  { value: "mercadopago", label: "MercadoPago" },
  { value: "credit", label: "Fiado" },
];

export default function PaymentModal({
  creditAccounts,
  onConfirm,
  onClose,
}: PaymentModalProps) {
  const { total, payments, addPayment, removePayment, totalPaid, remaining } =
    useCart();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [creditAccountId, setCreditAccountId] = useState("");
  const [loading, setLoading] = useState(false);

  function handleAddPayment(e: FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (numAmount <= 0) return;

    // TODO: MercadoPago integration — connect your payment flow here
    if (method === "mercadopago") {
      // For now, just register the payment amount like other methods
    }

    addPayment({ method, amount: numAmount });
    const newRemaining = Math.max(0, total - totalPaid - numAmount);
    setAmount(newRemaining.toFixed(2));
  }

  async function handleConfirm() {
    if (remaining > 0.01) return;
    setLoading(true);
    const credId = payments.some((p) => p.method === "credit")
      ? Number(creditAccountId) || undefined
      : undefined;
    await onConfirm(credId);
    setLoading(false);
  }

  const change = totalPaid > total ? totalPaid - total : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-surface-800/50 border border-surface-700">
        <div>
          <p className="text-sm text-surface-400 uppercase">Total</p>
          <p className="text-2xl font-bold text-surface-50">
            {formatCurrency(total)}
          </p>
        </div>
        <div>
          <p className="text-sm text-surface-400 uppercase">Pagado</p>
          <p className="text-2xl font-bold text-teal-400">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div>
          <p className="text-sm text-surface-400 uppercase">Restante</p>
          <p
            className={`text-2xl font-bold ${remaining > 0 ? "text-red-400" : "text-teal-400"}`}
          >
            {formatCurrency(remaining)}
          </p>
        </div>
        {change > 0 && (
          <div>
            <p className="text-sm text-surface-400 uppercase">Vuelto</p>
            <p className="text-2xl font-bold text-amber-400">
              {formatCurrency(change)}
            </p>
          </div>
        )}
      </div>

      {payments.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm text-surface-400 uppercase font-medium">
            Pagos registrados
          </p>
          {payments.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-3 rounded bg-surface-800/40 text-base"
            >
              <span className="text-surface-300 capitalize">{p.method}</span>
              <div className="flex items-center gap-2">
                <span className="text-surface-100">
                  {formatCurrency(p.amount)}
                </span>
                <button
                  onClick={() => removePayment(i)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {remaining > 0.01 && (
        <form onSubmit={handleAddPayment} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Método"
              options={paymentMethods}
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            />
            <Input
              label="Monto"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {method === "credit" && (
            <Select
              label="Cuenta de fiado *"
              placeholder="Seleccionar cliente"
              options={creditAccounts
                .filter((a) => a.is_active)
                .map((a) => ({
                  value: a.id,
                  label: `${a.customer_name} (Deuda: ${formatCurrency(a.balance)})`,
                }))}
              value={creditAccountId}
              onChange={(e) => setCreditAccountId(e.target.value)}
              required
            />
          )}

          <Button type="submit" variant="secondary" className="w-full">
            Agregar pago
          </Button>
        </form>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          loading={loading}
          disabled={remaining > 0.01}
          className="flex-1"
        >
          Confirmar venta
        </Button>
      </div>
    </div>
  );
}
