import { useState, useRef, useEffect } from "react";
import { api } from "../../services/api";
import { useCart } from "../../contexts/CartContext";
import type { Product } from "../../types";
import SearchInput from "../ui/SearchInput";
import toast from "react-hot-toast";
import { getProductBarcodes } from "../../utils/barcodes";

export default function ProductSearch() {
  const { addItem } = useCart();
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all active products once
  useEffect(() => {
    api
      .get<Product[]>("/products")
      .then((data) => setAllProducts((data ?? []).filter((p) => p.is_active)))
      .catch(() => setAllProducts([]));
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(() => {
      const normalizedQuery = query.trim().toLowerCase();

      const filtered = allProducts.filter((product) => {
        if (product.name.toLowerCase().includes(normalizedQuery)) return true;
        return getProductBarcodes(product).some((code) =>
          code.toLowerCase().includes(normalizedQuery),
        );
      });

      setResults(filtered.slice(0, 10));
      setShowResults(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, allProducts]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectProduct(product: Product) {
    if (product.stock_quantity <= 0) {
      toast.error("Producto sin stock");
      return;
    }
    addItem(product);
    setQuery("");
    setShowResults(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <SearchInput
        ref={inputRef}
        placeholder="Buscar producto o escanear código..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery("")}
        data-barcode-aware="true"
        autoFocus
      />

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-900 border border-surface-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProduct(p)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-800 transition-colors text-left border-b border-surface-800/60 last:border-0"
            >
              <div>
                <p className="text-base text-surface-100 font-medium">
                  {p.name}
                </p>
                <p className="text-sm text-surface-500">
                  {getProductBarcodes(p)
                    .slice(0, 2)
                    .map((code) => (
                      <span key={`${p.id}-${code}`} className="font-mono mr-2">
                        {code}
                      </span>
                    ))}
                  {p.category?.name && <span>{p.category.name}</span>}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-base font-semibold text-amber-400">
                  ${Number(p.sell_price).toFixed(2)}
                </p>
                <p
                  className={`text-sm ${p.stock_quantity <= p.min_stock_alert ? "text-red-400" : "text-surface-500"}`}
                >
                  Stock: {p.stock_quantity}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-900 border border-surface-700 rounded-lg shadow-xl z-50 px-4 py-6 text-center text-surface-500 text-base">
          No se encontraron productos
        </div>
      )}
    </div>
  );
}
