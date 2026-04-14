import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { CartProvider, useCart } from "../contexts/CartContext";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { findProductByBarcode } from "../hooks/useProducts";
import { createSale } from "../hooks/useSales";
import type { CashRegister, CreditAccount, Product } from "../types";
import ProductSearch from "../components/pos/ProductSearch";
import Cart from "../components/pos/Cart";
import PaymentModal from "../components/pos/PaymentModal";
import WeightInputModal from "../components/pos/WeightInputModal";
import Modal from "../components/ui/Modal";
import Alert from "../components/ui/Alert";
import toast from "react-hot-toast";

function POSContent() {
  const { user } = useAuth();
  const { items, total, clearCart, addItem, payments } = useCart();
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;

      try {
        const reg = await api.get<CashRegister | null>(
          "/cash-registers/current",
        );
        setCashRegister(reg);
      } catch {
        setCashRegister(null);
      }

      try {
        const credits = await api.get<CreditAccount[]>("/credits/accounts");
        setCreditAccounts((credits ?? []).filter((c) => c.is_active));
      } catch {
        setCreditAccounts([]);
      }

      setLoading(false);
    }
    load();
  }, [user]);

  useBarcodeScanner({
    enabled: !paymentOpen && !weightProduct,
    onScan: async (barcode) => {
      const data = await findProductByBarcode(barcode);

      if (data) {
        const product = data as Product;
        if (product.sell_by_weight) {
          setWeightProduct(product);
          toast.success(`${product.name} — ingresá el peso`);
          return;
        }
        if (product.stock_quantity <= 0) {
          toast.error(`Sin stock: ${product.name}`);
          return;
        }
        addItem(product);
        toast.success(`${product.name} agregado`);
      } else {
        toast.error(`Producto no encontrado: ${barcode}`);
      }
    },
  });

  async function handleConfirmSale(creditAccountId?: number) {
    if (!user || !cashRegister) return;

    const sale = await createSale(
      cashRegister.id,
      user.id,
      items,
      payments,
      creditAccountId,
    );

    if (sale) {
      clearCart();
      setPaymentOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-surface-400">
        Cargando...
      </div>
    );
  }

  if (!cashRegister) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Alert variant="warning">
          <strong>No hay caja abierta.</strong> Abrí un turno de caja desde la
          sección "Caja" antes de vender.
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      <div className="flex-1 flex flex-col gap-4">
        <ProductSearch />
        <div className="flex-1 flex items-center justify-center text-surface-600 text-sm">
          Escaneá un código de barras o buscá por nombre
        </div>
      </div>

      <div className="w-96 bg-surface-900 border border-surface-800 rounded-xl flex flex-col overflow-hidden">
        <Cart />
        {items.length > 0 && (
          <div className="p-4 border-t border-surface-800">
            <button
              onClick={() => setPaymentOpen(true)}
              className="w-full py-3 rounded-lg bg-amber-500 text-surface-950 font-semibold text-sm hover:bg-amber-400 active:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
            >
              Cobrar — ${total.toFixed(2)}
            </button>
          </div>
        )}
      </div>

      <WeightInputModal
        open={weightProduct !== null}
        product={weightProduct}
        onConfirm={(product, weight) => {
          addItem(product, weight);
          setWeightProduct(null);
        }}
        onClose={() => setWeightProduct(null)}
      />

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Cobrar venta"
        size="lg"
      >
        <PaymentModal
          cashRegisterId={cashRegister.id}
          creditAccounts={creditAccounts}
          onConfirm={handleConfirmSale}
          onClose={() => setPaymentOpen(false)}
        />
      </Modal>
    </div>
  );
}

export default function POSPage() {
  return (
    <CartProvider>
      <POSContent />
    </CartProvider>
  );
}
