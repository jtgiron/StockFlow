import { useState, useRef, useEffect } from "react";
import { api } from "../../services/api";
import { useCart } from "../../contexts/CartContext";
import type { Product } from "../../types";
import SearchInput from "../ui/SearchInput";
import WeightInputModal from "./WeightInputModal";
import toast from "react-hot-toast";
import { getProductBarcodes } from "../../utils/barcodes";

export default function ProductSearch() {
  const { addItem } = useCart();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function extractProducts(payload: Product[] | { items?: Product[] } | null) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
  }

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(() => {
      const normalizedQuery = query.trim().toLowerCase();

      api
        .get<Product[] | { items: Product[] }>(
          `/products?search=${encodeURIComponent(normalizedQuery)}&only_active=true&limit=20`,
        )
        .then((data) => {
          const serverResults = extractProducts(data);
          setResults(serverResults.slice(0, 10));
          setShowResults(true);
        })
        .catch(() => {
          setResults([]);
          setShowResults(true);
        });
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

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
    if (product.sell_by_weight) {
      setWeightProduct(product);
      setQuery("");
      setShowResults(false);
      return;
    }
    if (product.stock_quantity <= 0) {
      toast.error("Producto sin stock");
      return;
    }
    addItem(product);
    setQuery("");
    setShowResults(false);
    inputRef.current?.focus();
  }

  function handleWeightConfirm(product: Product, weight: number) {
    addItem(product, weight);
    setWeightProduct(null);
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
                  {p.sell_by_weight && <span className="text-xs text-surface-500">/kg</span>}
                </p>
                {p.sell_by_weight ? (
                  <p className="text-sm text-blue-400">Por peso</p>
                ) : (
                  <p
                    className={`text-sm ${p.stock_quantity <= p.min_stock_alert ? "text-red-400" : "text-surface-500"}`}
                  >
                    Stock: {p.stock_quantity}
                  </p>
                )}
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

      <WeightInputModal
        open={weightProduct !== null}
        product={weightProduct}
        onConfirm={handleWeightConfirm}
        onClose={() => setWeightProduct(null)}
      />
    </div>
  );
}
