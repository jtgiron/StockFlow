import { useState, useEffect, type FormEvent } from "react";
import { usePriceLists, usePriceListItems } from "../hooks/usePriceLists";
import { api } from "../services/api";
import { formatCurrency } from "../utils/formatters";
import type { PriceList, Product } from "../types";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import Select from "../components/ui/Select";

export default function PriceListsPage() {
  const { lists, loading, createList, updateList, deleteList } =
    usePriceLists();
  const [formOpen, setFormOpen] = useState(false);
  const [editList, setEditList] = useState<PriceList | null>(null);
  const [detailList, setDetailList] = useState<PriceList | null>(null);
  const [name, setName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  function openCreate() {
    setEditList(null);
    setName("");
    setFormOpen(true);
  }

  function openEdit(l: PriceList) {
    setEditList(l);
    setName(l.name);
    setFormOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    if (editList) {
      await updateList(editList.id, { name });
    } else {
      await createList(name);
    }
    setFormOpen(false);
    setActionLoading(false);
  }

  const columns = [
    { header: "Nombre", accessor: (l: PriceList) => l.name },
    {
      header: "Estado",
      accessor: (l: PriceList) => (
        <Badge variant={l.status === "applied" ? "success" : "warning"}>
          {l.status === "applied" ? "Aplicada" : "Borrador"}
        </Badge>
      ),
    },
    {
      header: "Acciones",
      accessor: (l: PriceList) => (
        <div className="flex gap-2">
          <button
            onClick={() => setDetailList(l)}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            Precios
          </button>
          <button
            onClick={() => openEdit(l)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Editar
          </button>
          <button
            onClick={() => {
              if (confirm("¿Eliminar lista?")) deleteList(l.id);
            }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Eliminar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-surface-50">
          Listas de Precios
        </h1>
        <Button onClick={openCreate}>Nueva lista</Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={lists}
          keyExtractor={(l) => l.id}
          loading={loading}
        />
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editList ? "Editar lista" : "Nueva lista de precios"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nombre *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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

      {detailList && (
        <PriceListDetail
          list={detailList}
          onClose={() => setDetailList(null)}
        />
      )}
    </div>
  );
}

function PriceListDetail({
  list,
  onClose,
}: {
  list: PriceList;
  onClose: () => void;
}) {
  const { items, loading, addItem, removeItem, applyList } = usePriceListItems(
    list.id,
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    api
      .get<{ items: Product[] }>("/products?only_active=true&limit=200")
      .then((data) => {
        setProducts(data?.items ?? []);
      })
      .catch(() => setProducts([]));
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const ok = await addItem(Number(selectedProduct), Number(customPrice));
    if (ok) {
      setSelectedProduct("");
      setCustomPrice("");
    }
  }

  async function handleApply() {
    setApplying(true);
    await applyList();
    setApplying(false);
  }

  const itemColumns = [
    {
      header: "Producto",
      accessor: (i: (typeof items)[number]) =>
        i.product?.name ?? `ID ${i.product_id}`,
    },
    {
      header: "Precio actual",
      accessor: (i: (typeof items)[number]) =>
        i.product ? formatCurrency(i.product.sell_price) : "—",
    },
    {
      header: "Precio lista",
      accessor: (i: (typeof items)[number]) => formatCurrency(i.new_price),
    },
    {
      header: "",
      accessor: (i: (typeof items)[number]) => (
        <button
          onClick={() => removeItem(i.id)}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Quitar
        </button>
      ),
    },
  ];

  return (
    <Modal open onClose={onClose} title={`Precios — ${list.name}`} size="xl">
      <div className="space-y-4">
        <form onSubmit={handleAdd} className="flex gap-3 items-end">
          <div className="flex-1">
            <Select
              label="Producto"
              placeholder="Seleccionar..."
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} (${formatCurrency(p.sell_price)})`,
              }))}
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              required
            />
          </div>
          <div className="w-40">
            <Input
              label="Nuevo precio"
              type="number"
              step="0.01"
              min="0"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm">
            Agregar
          </Button>
        </form>

        <Table
          columns={itemColumns}
          data={items}
          keyExtractor={(i) => i.id}
          loading={loading}
        />

        {items.length > 0 && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleApply} loading={applying} variant="danger">
              Aplicar precios a productos
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
