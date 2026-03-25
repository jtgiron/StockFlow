import { useState } from "react";
import { useStock } from "../hooks/useStock";
import { useProducts } from "../hooks/useProducts";
import { useAuth } from "../contexts/AuthContext";
import { formatDateTime } from "../utils/formatters";
import Card, { CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Alert from "../components/ui/Alert";
import { getPrimaryBarcode } from "../utils/barcodes";

export default function StockPage() {
  const { movements, lowStockProducts, loading, addEntry, adjustStock } =
    useStock();
  const { products } = useProducts();
  const { user, isAdmin } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"entry" | "adjustment">("entry");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openModal(type: "entry" | "adjustment") {
    setModalType(type);
    setSelectedProduct("");
    setQuantity("");
    setReason("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedProduct || !quantity) return;
    setSubmitting(true);

    const productId = Number(selectedProduct);
    const qty = Number(quantity);

    let ok: boolean;
    if (modalType === "entry") {
      ok = await addEntry(productId, qty, reason, user.id);
    } else {
      ok = await adjustStock(productId, qty, reason, user.id);
    }

    setSubmitting(false);
    if (ok) setModalOpen(false);
  }

  const movementBadge = (type: string) => {
    switch (type) {
      case "entry":
        return <Badge variant="success">Entrada</Badge>;
      case "exit":
        return <Badge variant="danger">Salida</Badge>;
      case "adjustment":
        return <Badge variant="warning">Ajuste</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {lowStockProducts.length > 0 && (
        <Alert variant="warning">
          <strong>Stock bajo:</strong> {lowStockProducts.length} producto(s) por
          debajo del mínimo:{" "}
          {lowStockProducts
            .slice(0, 5)
            .map((p) => p.name)
            .join(", ")}
          {lowStockProducts.length > 5 &&
            ` y ${lowStockProducts.length - 5} más`}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Movimientos de Stock"
          description="Historial de entradas, salidas y ajustes"
          action={
            <div className="flex gap-2">
              <Button onClick={() => openModal("entry")}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Entrada
              </Button>
              {isAdmin && (
                <Button
                  variant="secondary"
                  onClick={() => openModal("adjustment")}
                >
                  Ajuste
                </Button>
              )}
            </div>
          }
        />

        {loading ? (
          <div className="text-center py-8 text-surface-400">Cargando...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-surface-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800 bg-surface-900/60">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-surface-400 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">
                    Motivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-surface-500"
                    >
                      Sin movimientos
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-surface-800/60 hover:bg-surface-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-surface-400 text-xs">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-4 py-3 text-surface-100">
                        {m.product?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {movementBadge(m.movement_type)}
                      </td>
                      <td className="px-4 py-3 text-right text-surface-200 font-mono">
                        {m.quantity}
                      </td>
                      <td className="px-4 py-3 text-surface-400">
                        {m.reason || "—"}
                      </td>
                      <td className="px-4 py-3 text-surface-300">
                        {m.profile?.full_name ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === "entry" ? "Registrar entrada" : "Ajuste de stock"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Producto *"
            placeholder="Seleccionar producto"
            options={products
              .filter((p) => p.is_active)
              .map((p) => ({
                value: p.id,
                label: `${p.name}${getPrimaryBarcode(p) ? ` (${getPrimaryBarcode(p)})` : ""} — Stock: ${p.stock_quantity}`,
              }))}
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            required
          />
          <Input
            label={
              modalType === "entry" ? "Cantidad a ingresar *" : "Nuevo stock *"
            }
            type="number"
            min={modalType === "entry" ? "1" : "0"}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <Input
            label="Motivo"
            placeholder="Razón del movimiento"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
