import { useState, type FormEvent } from "react";
import { useCredits, useCreditTransactions } from "../hooks/useCredits";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import type { CreditAccount, CreditTransaction } from "../types";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import SearchInput from "../components/ui/SearchInput";

export default function CreditsPage() {
  const { user, isAdmin } = useAuth();
  const { accounts, loading, createAccount, updateAccount, toggleActive } =
    useCredits();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [detailAccount, setDetailAccount] = useState<CreditAccount | null>(
    null,
  );
  const [editAccount, setEditAccount] = useState<CreditAccount | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const {
    transactions,
    loading: txLoading,
    addPayment,
    refresh: refreshTx,
  } = useCreditTransactions(detailAccount?.id ?? null);

  const filtered = accounts.filter(
    (a) =>
      a.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      a.phone?.toLowerCase().includes(search.toLowerCase()),
  );

  function openCreate() {
    setEditAccount(null);
    setName("");
    setPhone("");
    setFormOpen(true);
  }

  function openEdit(acc: CreditAccount) {
    setEditAccount(acc);
    setName(acc.customer_name);
    setPhone(acc.phone || "");
    setFormOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    if (editAccount) {
      await updateAccount(editAccount.id, {
        customer_name: name,
        phone: phone || null,
      });
    } else {
      await createAccount(name, phone);
    }
    setFormOpen(false);
    setActionLoading(false);
  }

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!user || !detailAccount) return;
    setActionLoading(true);
    const ok = await addPayment(
      Number(payAmount),
      user.id,
      payNotes || undefined,
    );
    if (ok) {
      setPayOpen(false);
      setPayAmount("");
      setPayNotes("");
    }
    setActionLoading(false);
  }

  const columns = [
    { header: "Cliente", accessor: (a: CreditAccount) => a.customer_name },
    { header: "Teléfono", accessor: (a: CreditAccount) => a.phone || "—" },
    {
      header: "Deuda",
      accessor: (a: CreditAccount) => (
        <span
          className={
            Number(a.balance) > 0
              ? "text-red-400 font-medium"
              : "text-surface-400"
          }
        >
          {formatCurrency(a.balance)}
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: (a: CreditAccount) => (
        <Badge variant={a.is_active ? "success" : "default"}>
          {a.is_active ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      header: "Acciones",
      accessor: (a: CreditAccount) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setDetailAccount(a);
              refreshTx();
            }}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            Historial
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => openEdit(a)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Editar
              </button>
              <button
                onClick={() => toggleActive(a.id, a.is_active)}
                className="text-xs text-surface-400 hover:text-surface-300"
              >
                {a.is_active ? "Desactivar" : "Activar"}
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const txColumns = [
    {
      header: "Fecha",
      accessor: (t: CreditTransaction) => formatDateTime(t.created_at),
    },
    {
      header: "Tipo",
      accessor: (t: CreditTransaction) => (
        <Badge variant={t.type === "payment" ? "success" : "warning"}>
          {t.type === "payment" ? "Pago" : "Cargo"}
        </Badge>
      ),
    },
    {
      header: "Monto",
      accessor: (t: CreditTransaction) => (
        <span
          className={t.type === "payment" ? "text-teal-400" : "text-red-400"}
        >
          {t.type === "payment" ? "-" : "+"}
          {formatCurrency(t.amount)}
        </span>
      ),
    },
    { header: "Nota", accessor: (t: CreditTransaction) => t.notes || "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-surface-50">
          Fiados / Créditos
        </h1>
        {isAdmin && <Button onClick={openCreate}>Nueva cuenta</Button>}
      </div>

      <SearchInput
        placeholder="Buscar cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
      />

      <Card>
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(a) => a.id}
          loading={loading}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editAccount ? "Editar cuenta" : "Nueva cuenta de fiado"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nombre del cliente *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={actionLoading}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail / History Modal */}
      <Modal
        open={!!detailAccount}
        onClose={() => setDetailAccount(null)}
        title={`Historial — ${detailAccount?.customer_name}`}
        size="lg"
      >
        {detailAccount && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-surface-400 uppercase">
                  Deuda actual
                </p>
                <p className="text-lg font-bold text-red-400">
                  {formatCurrency(detailAccount.balance)}
                </p>
              </div>
              <div>
                <Button
                  size="sm"
                  onClick={() => {
                    setPayAmount("");
                    setPayNotes("");
                    setPayOpen(true);
                  }}
                >
                  Registrar pago
                </Button>
              </div>
            </div>
            <Table
              columns={txColumns}
              data={transactions}
              keyExtractor={(t) => t.id}
              loading={txLoading}
            />
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Registrar pago"
      >
        <form onSubmit={handlePay} className="space-y-4">
          <Input
            label="Monto *"
            type="number"
            step="0.01"
            min="0.01"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            required
          />
          <Input
            label="Nota"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            placeholder="Detalle del pago..."
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setPayOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={actionLoading}>
              Confirmar pago
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
