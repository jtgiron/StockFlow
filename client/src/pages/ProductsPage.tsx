import { useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency } from "../utils/formatters";
import Card, { CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import SearchInput from "../components/ui/SearchInput";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import ProductForm from "../components/products/ProductForm";

import type { Product } from "../types";
import { getProductBarcodes } from "../utils/barcodes";

export default function ProductsPage() {
  const {
    products,
    loading,
    createProduct,
    updateProduct,
    toggleActive,
    deleteProduct,
  } = useProducts();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const filtered = products.filter((p) => {
    const searchValue = search.toLowerCase();
    const allBarcodes = getProductBarcodes(p);
    const matchesSearch =
      p.name.toLowerCase().includes(searchValue) ||
      allBarcodes.some((code) => code.toLowerCase().includes(searchValue)) ||
      p.category?.name?.toLowerCase().includes(searchValue);
    const matchesActive = showInactive || p.is_active;
    return matchesSearch && matchesActive;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setModalOpen(true);
  }

  async function handleDeleteProduct() {
    if (!deleteTarget) return;

    setDeleting(true);
    const ok = await deleteProduct(deleteTarget.id);
    setDeleting(false);

    if (ok) {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Productos"
          description={`${filtered.length} productos`}
          action={
            isAdmin && (
              <div className="flex gap-2">
                <Button onClick={openCreate}>
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
                  Nuevo producto
                </Button>
              </div>
            )
          }
        />

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Buscar por nombre, código de barras o categoría..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              onClear={() => {
                setSearch("");
                setPage(1);
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => {
                setShowInactive(e.target.checked);
                setPage(1);
              }}
              className="rounded border-surface-600 bg-surface-800"
            />
            Inactivos
          </label>
        </div>

        {loading ? (
          <div className="text-center py-8 text-surface-400">Cargando...</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-surface-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800 bg-surface-900/60">
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">
                      Costo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">
                      Venta
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-surface-400 uppercase tracking-wider">
                      Estado
                    </th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 8 : 7}
                        className="px-4 py-8 text-center text-surface-500"
                      >
                        No se encontraron productos
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-surface-800/60 hover:bg-surface-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-surface-100 font-medium">
                          {p.name}
                        </td>
                        <td className="px-4 py-3 text-surface-400 font-mono text-xs">
                          {getProductBarcodes(p).slice(0, 2).join(" · ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-surface-300">
                          {p.category?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-surface-400">
                          {formatCurrency(p.cost_price)}
                        </td>
                        <td className="px-4 py-3 text-right text-surface-100">
                          {formatCurrency(p.sell_price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              p.stock_quantity <= p.min_stock_alert
                                ? "text-red-400 font-semibold"
                                : "text-surface-200"
                            }
                          >
                            {p.stock_quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={p.is_active ? "success" : "default"}>
                            {p.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(p)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleActive(p.id, p.is_active)}
                              >
                                {p.is_active ? "Desactivar" : "Activar"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => setDeleteTarget(p)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-xs text-surface-500">
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filtered.length)} de{" "}
                  {filtered.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Anterior
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (n) => (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                          n === page
                            ? "bg-amber-500 text-surface-950"
                            : "text-surface-400 hover:bg-surface-800"
                        }`}
                      >
                        {n}
                      </button>
                    ),
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar producto" : "Nuevo producto"}
        size="lg"
      >
        <ProductForm
          product={editing}
          onSubmit={async (data) => {
            if (editing) {
              return updateProduct(editing.id, data);
            }
            return createProduct(data);
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirmar eliminacion"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            Esta accion elimina el producto de forma permanente.
          </div>

          <p className="text-sm text-surface-200">
            ¿Seguro que quieres eliminar el producto
            <span className="font-semibold text-surface-50">
              {` ${deleteTarget?.name || "sin nombre"}`}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProduct}
              loading={deleting}
            >
              Eliminar producto
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
