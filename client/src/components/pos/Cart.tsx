import { formatCurrency } from "../../utils/formatters";
import { useCart } from "../../contexts/CartContext";

export default function Cart() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-500 py-12">
        <svg
          className="w-14 h-14 mb-3 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
        <p className="text-base">Carrito vacío</p>
        <p className="text-sm mt-1">Escaneá o buscá productos</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <span className="text-base font-medium text-surface-300">
          {items.length} item(s)
        </span>
        <button
          onClick={clearCart}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Vaciar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="px-4 py-3 border-b border-surface-800/60 hover:bg-surface-800/30 transition-colors"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-base text-surface-100 font-medium leading-tight pr-2">
                {item.product.name}
              </span>
              <button
                onClick={() => removeItem(item.product.id)}
                className="text-surface-500 hover:text-red-400 transition-colors shrink-0 p-0.5"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    updateQuantity(item.product.id, item.quantity - 1)
                  }
                  className="w-7 h-7 rounded bg-surface-800 text-surface-300 hover:bg-surface-700 flex items-center justify-center text-base transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center text-base font-mono text-surface-200">
                  {item.quantity}
                </span>
                <button
                  onClick={() =>
                    updateQuantity(item.product.id, item.quantity + 1)
                  }
                  className="w-7 h-7 rounded bg-surface-800 text-surface-300 hover:bg-surface-700 flex items-center justify-center text-base transition-colors"
                >
                  +
                </button>
                <span className="text-sm text-surface-500 ml-2">
                  × {formatCurrency(item.unit_price)}
                </span>
              </div>
              <span className="text-base font-medium text-amber-400">
                {formatCurrency(item.subtotal)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-surface-700 px-4 py-4 bg-surface-900/80">
        <div className="flex justify-between items-center">
          <span className="text-xl font-semibold text-surface-50">Total</span>
          <span className="text-2xl font-bold text-amber-400">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
