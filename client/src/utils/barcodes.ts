import type { Product } from "../types";

type ProductWithBarcodes = Pick<Product, "barcode" | "barcodes">;

export function getProductBarcodes(
  product?: ProductWithBarcodes | null,
): string[] {
  if (!product) return [];

  const legacy = product.barcode ? [product.barcode] : [];
  const multi = Array.isArray(product.barcodes) ? product.barcodes : [];

  const normalized = [...legacy, ...multi]
    .map((code) => code.trim())
    .filter(Boolean);

  return [...new Set(normalized)];
}

export function getPrimaryBarcode(
  product?: ProductWithBarcodes | null,
): string | null {
  return getProductBarcodes(product)[0] ?? null;
}

export function parseBarcodesInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,;]+/)
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ];
}
