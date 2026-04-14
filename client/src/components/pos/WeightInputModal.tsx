import { useState } from "react";
import type { Product } from "../../types";
import { formatCurrency } from "../../utils/formatters";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

interface WeightInputModalProps {
  open: boolean;
  product: Product | null;
  onConfirm: (product: Product, weight: number) => void;
  onClose: () => void;
}

const PRESETS = [
  { label: "100g", value: 100 },
  { label: "250g", value: 250 },
  { label: "500g", value: 500 },
  { label: "1 kg", value: 1000 },
];

export default function WeightInputModal({
  open,
  product,
  onConfirm,
  onClose,
}: WeightInputModalProps) {
  const [weight, setWeight] = useState("");

  const grams = parseFloat(weight) || 0;
  const weightInKg = grams / 1000;
  const unitPrice = product ? Number(product.sell_price) : 0;
  const subtotal = unitPrice * weightInKg;

  function handleConfirm() {
    if (!product || grams <= 0) return;
    onConfirm(product, weightInKg);
    setWeight("");
    onClose();
  }

  function handleClose() {
    setWeight("");
    onClose();
  }

  function handlePreset(value: number) {
    setWeight(value.toString());
  }

  if (!product) return null;

  return (
    <Modal open={open} onClose={handleClose} title={product.name} size="sm">
      <div className="space-y-4">
        <p className="text-base text-surface-400">
          Precio: <span className="text-amber-400 font-semibold">{formatCurrency(unitPrice)}/kg</span>
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="weight-input" className="text-base font-medium text-surface-400">
            Peso (gramos)
          </label>
          <input
            id="weight-input"
            type="number"
            step="1"
            min="1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
              }
            }}
            placeholder="0"
            autoFocus
            className="w-full rounded-lg border border-surface-700 bg-surface-900 px-4 py-3 text-2xl font-mono text-center text-surface-100 placeholder:text-surface-600 outline-none transition-all focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handlePreset(p.value)}
              className="py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-base font-medium transition-colors border border-surface-700"
            >
              {p.label}
            </button>
          ))}
        </div>

        {grams > 0 && (
          <div className="flex justify-between items-center py-3 px-4 bg-surface-800/50 rounded-lg border border-surface-700/50">
            <span className="text-base text-surface-400">Subtotal</span>
            <span className="text-xl font-bold text-amber-400">{formatCurrency(subtotal)}</span>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={grams <= 0}>
            Agregar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
