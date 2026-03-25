import { useState, type FormEvent } from "react";
import {
  CashRegisterProvider,
  useCashRegisterContext,
} from "../contexts/CashRegisterContext";
import { useCashRegister } from "../hooks/useCashRegister";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import Card, { CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Table from "../components/ui/Table";
import type { CashRegister } from "../types";

function CashRegisterContent() {
  const { isAdmin } = useAuth();
  const {
    currentRegister,
    loading: ctxLoading,
    openRegister,
    closeRegister,
  } = useCashRegisterContext();
  const { history, loading: histLoading, refresh } = useCashRegister();
  const [initialAmount, setInitialAmount] = useState("0");
  const [finalAmount, setFinalAmount] = useState("");
  const [finalAmountqr, setFinalAmountqr] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function handleOpen(e: FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const ok = await openRegister(Number(initialAmount));
    if (ok) {
      setInitialAmount("0");
      refresh();
    }
    setActionLoading(false);
  }

  async function handleClose(e: FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const ok = await closeRegister(
      Number(finalAmount),
      Number(finalAmountqr),
      closingNotes || undefined,
    );
    if (ok) {
      setFinalAmount("");
      setFinalAmountqr("");
      setClosingNotes("");
      refresh();
    }
    setActionLoading(false);
  }

  const columns = [
    {
      header: "Apertura",
      accessor: (r: CashRegister) => formatDateTime(r.opened_at),
    },
    {
      header: "Cierre",
      accessor: (r: CashRegister) =>
        r.closed_at ? formatDateTime(r.closed_at) : "—",
    },
    {
      header: "Estado",
      accessor: (r: CashRegister) => (
        <Badge variant={r.status === "open" ? "success" : "default"}>
          {r.status === "open" ? "Abierta" : "Cerrada"}
        </Badge>
      ),
    },
    {
      header: "Monto inicial",
      accessor: (r: CashRegister) =>
        formatCurrency(Number(r.openingcash_amount ?? 0)),
    },
    {
      header: "Monto cierre efectivo",
      accessor: (r: CashRegister) =>
        r.closingcash_amount != null
          ? formatCurrency(r.closingcash_amount)
          : "—",
    },
    {
      header: "Monto cierre QR",
      accessor: (r: CashRegister) =>
        r.closingqr_amount != null ? formatCurrency(r.closingqr_amount) : "—",
    },
    {
      header: "Diferencia",
      accessor: (r: CashRegister) => {
        if (r.status !== "closed" || r.difference == null) return "—";
        const diff = Number(r.difference);
        return (
          <span
            className={
              diff < -0.01
                ? "text-red-400"
                : diff > 0.01
                  ? "text-teal-400"
                  : "text-surface-400"
            }
          >
            {diff >= 0 ? "+" : ""}
            {formatCurrency(diff)}
          </span>
        );
      },
    },
  ];

  if (ctxLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh] text-surface-400">
        Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-semibold text-surface-50">
        Caja Registradora
      </h1>

      {!currentRegister ? (
        <Card>
          <CardHeader title="Abrir turno de caja" />
          <form onSubmit={handleOpen} className="p-4 space-y-4">
            <Input
              label="Monto inicial efectivo"
              type="number"
              step="0.01"
              min="0"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
            />

            <Button type="submit" loading={actionLoading}>
              Abrir caja
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Turno actual — Caja abierta" />
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-surface-400 uppercase">Apertura</p>
                <p className="text-surface-100">
                  {formatDateTime(currentRegister.opened_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-400 uppercase">
                  Monto inicial efectivo
                </p>
                <p className="text-surface-100">
                  {formatCurrency(
                    Number(currentRegister.openingcash_amount ?? 0),
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-400 uppercase">Estado</p>
                <Badge variant="success">Abierta</Badge>
              </div>
            </div>

            <hr className="border-surface-800" />

            <form onSubmit={handleClose} className="space-y-4">
              <p className="text-sm font-medium text-surface-300">
                Cerrar turno
              </p>
              <Input
                label="Monto final en caja"
                type="number"
                step="0.01"
                min="0"
                value={finalAmount}
                onChange={(e) => setFinalAmount(e.target.value)}
                required
              />
              <Input
                label="Monto final en caja (QR)"
                type="number"
                step="0.01"
                min="0"
                value={finalAmountqr}
                onChange={(e) => setFinalAmountqr(e.target.value)}
                required
              />
              <Input
                label="Notas (opcional)"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Observaciones del cierre..."
              />
              <Button type="submit" variant="danger" loading={actionLoading}>
                Cerrar caja
              </Button>
            </form>
          </div>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader title="Historial de cajas" />
          <Table
            columns={columns}
            data={history}
            keyExtractor={(r) => r.id}
            loading={histLoading}
          />
        </Card>
      )}
    </div>
  );
}

export default function CashRegisterPage() {
  return (
    <CashRegisterProvider>
      <CashRegisterContent />
    </CashRegisterProvider>
  );
}
