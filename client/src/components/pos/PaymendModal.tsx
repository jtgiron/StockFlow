import { useState, useEffect, useRef, type FormEvent } from "react";
import { useCart } from "../../contexts/CartContext";
import { formatCurrency } from "../../utils/formatters";
import { createMpOrder, getMpOrderStatus } from "../../hooks/useSales";
import type { PaymentMethod, CreditAccount } from "../../types";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Spinner from "../ui/Spinner";

interface PaymentModalProps {
  cashRegisterId: number;
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
  cashRegisterId,
  creditAccounts,
  onConfirm,
  onClose,
}: PaymentModalProps) {
  const {
    items,
    total,
    payments,
    addPayment,
    removePayment,
    totalPaid,
    remaining,
    clearCart,
  } = useCart();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [creditAccountId, setCreditAccountId] = useState("");
  const [loading, setLoading] = useState(false);

  // MP QR waiting state
  const [mpWaiting, setMpWaiting] = useState(false);
  const [mpExternalRef, setMpExternalRef] = useState<string | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);
  const [mpElapsed, setMpElapsed] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MP_TIMEOUT_SECONDS = 15 * 60; // 15 minutes

  // Cleanup polling/timer on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function handleAddPayment(e: FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (numAmount <= 0) return;

    addPayment({ method, amount: numAmount });
    const newRemaining = Math.max(0, total - totalPaid - numAmount);
    setAmount(newRemaining.toFixed(2));
  }

  async function handleConfirm() {
    if (remaining > 0.01) return;

    // Check if any payment is mercadopago — trigger MP flow
    const hasMpPayment = payments.some((p) => p.method === "mercadopago");

    if (hasMpPayment) {
      await startMpFlow();
      return;
    }

    setLoading(true);
    const credId = payments.some((p) => p.method === "credit")
      ? Number(creditAccountId) || undefined
      : undefined;
    await onConfirm(credId);
    setLoading(false);
  }

  async function startMpFlow() {
    setLoading(true);
    setMpError(null);

    const result = await createMpOrder(cashRegisterId, items, total);

    if (!result) {
      setLoading(false);
      return; // toast already shown by createMpOrder
    }

    setMpExternalRef(result.external_reference);
    setMpWaiting(true);
    setMpElapsed(0);
    setLoading(false);

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setMpElapsed((prev) => {
        const next = prev + 1;
        if (next >= MP_TIMEOUT_SECONDS) {
          cancelMpWaiting("El tiempo de espera expiró");
        }
        return next;
      });
    }, 1000);

    // Start polling for status
    pollingRef.current = setInterval(async () => {
      const status = await getMpOrderStatus(result.external_reference);
      if (!status) return;

      if (status.status === "completed") {
        stopPolling();
        setMpWaiting(false);
        clearCart();
        onClose();
        // Sale was already created by webhook, just close
        const toast = (await import("react-hot-toast")).default;
        toast.success("Pago con MercadoPago confirmado");
      } else if (status.status === "cancelled") {
        cancelMpWaiting("El pago fue cancelado");
      } else if (status.status === "expired") {
        cancelMpWaiting("La orden expiró");
      }
    }, 4000);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function cancelMpWaiting(errorMsg?: string) {
    stopPolling();
    setMpWaiting(false);
    setMpExternalRef(null);
    if (errorMsg) setMpError(errorMsg);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const change = totalPaid > total ? totalPaid - total : 0;

  // MP waiting screen
  if (mpWaiting) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <h3 className="text-lg font-semibold text-surface-50">
            Esperando pago con QR...
          </h3>
          <p className="text-surface-400 text-sm">
            El cliente debe escanear el código QR de la caja con la app de
            Mercado Pago
          </p>
        </div>

        <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700">
          <p className="text-sm text-surface-400 uppercase">Monto a cobrar</p>
          <p className="text-3xl font-bold text-teal-400">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="text-surface-500 text-sm">
          Tiempo transcurrido:{" "}
          <span className="text-surface-300 font-mono">
            {formatTime(mpElapsed)}
          </span>
          <span className="text-surface-600">
            {" "}
            / {formatTime(MP_TIMEOUT_SECONDS)}
          </span>
        </div>

        <Button
          variant="secondary"
          onClick={() => cancelMpWaiting()}
          className="w-full"
        >
          Cancelar espera
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mpError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {mpError}
        </div>
      )}

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
