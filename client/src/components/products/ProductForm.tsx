import { useState, type FormEvent, useEffect } from "react";
import type { Product } from "../../types";
import { useCategories } from "../../hooks/useCategories";
import { getProductBarcodes, parseBarcodesInput } from "../../utils/barcodes";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (
    data: Omit<Product, "id" | "created_at" | "updated_at" | "category">,
  ) => Promise<boolean>;
  onCancel: () => void;
}

export default function ProductForm({
  product,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const { categories } = useCategories();
  const [loading, setLoading] = useState(false);
  const initialBarcodes = getProductBarcodes(product).join(", ");
  const [form, setForm] = useState({
    barcodesInput: initialBarcodes,
    name: product?.name ?? "",
    description: product?.description ?? "",
    category_id: product?.category_id?.toString() ?? "",
    cost_price: product?.cost_price?.toString() ?? "0",
    sell_price: product?.sell_price?.toString() ?? "0",
    stock_quantity: product?.stock_quantity?.toString() ?? "0",
    min_stock_alert: product?.min_stock_alert?.toString() ?? "5",
    is_active: product?.is_active ?? true,
    image_url: product?.image_url ?? "",
  });

  useEffect(() => {
    if (product) {
      setForm({
        barcodesInput: getProductBarcodes(product).join(", "),
        name: product.name ?? "",
        description: product.description ?? "",
        category_id: product.category_id?.toString() ?? "",
        cost_price: product.cost_price?.toString() ?? "0",
        sell_price: product.sell_price?.toString() ?? "0",
        stock_quantity: product.stock_quantity?.toString() ?? "0",
        min_stock_alert: product.min_stock_alert?.toString() ?? "5",
        is_active: product.is_active ?? true,
        image_url: product.image_url ?? "",
      });
    }
  }, [product]);

  function updateField(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const barcodes = parseBarcodesInput(form.barcodesInput);

    const ok = await onSubmit({
      barcode: barcodes[0] ?? null,
      barcodes,
      name: form.name,
      description: form.description || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      cost_price: Number(form.cost_price),
      sell_price: Number(form.sell_price),
      stock_quantity: Number(form.stock_quantity),
      min_stock_alert: Number(form.min_stock_alert),
      is_active: form.is_active,
      image_url: form.image_url || null,
    });
    setLoading(false);
    if (ok) onCancel();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Códigos de barras"
          placeholder="Separar por coma (ej: 779..., 750...)"
          value={form.barcodesInput}
          onChange={(e) => updateField("barcodesInput", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />
        <Input
          label="Nombre *"
          placeholder="Nombre del producto"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          required
        />
      </div>

      <Input
        label="Descripción"
        placeholder="Descripción opcional"
        value={form.description}
        onChange={(e) => updateField("description", e.target.value)}
      />

      <Select
        label="Categoría"
        placeholder="Sin categoría"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        value={form.category_id}
        onChange={(e) => updateField("category_id", e.target.value)}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Precio de costo"
          type="number"
          step="0.01"
          min="0"
          value={form.cost_price}
          onChange={(e) => updateField("cost_price", e.target.value)}
        />
        <Input
          label="Precio de venta"
          type="number"
          step="0.01"
          min="0"
          value={form.sell_price}
          onChange={(e) => updateField("sell_price", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Stock actual"
          type="number"
          min="0"
          value={form.stock_quantity}
          onChange={(e) => updateField("stock_quantity", e.target.value)}
        />
        <Input
          label="Alerta stock mínimo"
          type="number"
          min="0"
          value={form.min_stock_alert}
          onChange={(e) => updateField("min_stock_alert", e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={form.is_active}
          onChange={(e) => updateField("is_active", e.target.checked)}
          className="rounded border-surface-600 bg-surface-800 text-amber-500 focus:ring-amber-500/40"
        />
        <label htmlFor="is_active" className="text-base text-surface-300">
          Producto activo
        </label>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {product ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
