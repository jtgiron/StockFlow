import { parseBarcodesInput } from "./barcodes";

// Límites de seguridad
export const MAX_ROWS = 1000;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Tipos exportados
export interface ParsedRow {
  rowNumber: number;
  data: Record<string, unknown>;
  valid: boolean;
  errors: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  validCount: number;
  invalidCount: number;
  headers: string[];
}

// Mapeo de nombres de columnas (en español e inglés) al campo de producto
const HEADER_MAP: Record<string, string> = {
  // nombre
  nombre: "name",
  name: "name",
  // descripcion
  descripcion: "description",
  descripción: "description",
  description: "description",
  // categoria
  categoria: "category_name",
  categoría: "category_name",
  category: "category_name",
  category_name: "category_name",
  // barcodes — se parsea con parseBarcodesInput
  codigo_barras: "barcodes",
  código_de_barras: "barcodes",
  "código de barras": "barcodes",
  "codigo de barras": "barcodes",
  barcode: "barcodes",
  barcodes: "barcodes",
  codigo: "barcodes",
  código: "barcodes",
  // precio costo
  precio_costo: "cost_price",
  costo: "cost_price",
  cost_price: "cost_price",
  // precio venta
  precio_venta: "sell_price",
  precio: "sell_price",
  venta: "sell_price",
  sell_price: "sell_price",
  // stock
  stock: "stock_quantity",
  stock_quantity: "stock_quantity",
  cantidad: "stock_quantity",
  // stock mínimo
  stock_minimo: "min_stock_alert",
  stock_mínimo: "min_stock_alert",
  minimo: "min_stock_alert",
  mínimo: "min_stock_alert",
  alerta: "min_stock_alert",
  min_stock_alert: "min_stock_alert",
};

// Normaliza el header: minúsculas, sin espacios redundantes
function normalizeHeader(raw: string): string {
  return String(raw).trim().toLowerCase();
}

// Convierte un valor crudo a número, devuelve null si no es válido
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

// Valida una fila ya mapeada y devuelve los errores encontrados
function validateRow(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  // nombre obligatorio
  const name = data["name"];
  if (!name || String(name).trim() === "") {
    errors.push("El nombre es obligatorio");
  }

  // precios >= 0
  for (const field of ["cost_price", "sell_price"] as const) {
    const val = data[field];
    if (val !== undefined && val !== null && val !== "") {
      const n = toNumber(val);
      if (n === null) {
        errors.push(`${field} debe ser un número`);
      } else if (n < 0) {
        errors.push(`${field} debe ser >= 0`);
      }
    }
  }

  // stock entero >= 0
  for (const field of ["stock_quantity", "min_stock_alert"] as const) {
    const val = data[field];
    if (val !== undefined && val !== null && val !== "") {
      const n = toNumber(val);
      if (n === null) {
        errors.push(`${field} debe ser un número`);
      } else if (!Number.isInteger(n) || n < 0) {
        errors.push(`${field} debe ser un entero >= 0`);
      }
    }
  }

  return errors;
}

// Determina si una fila está completamente vacía (todos los valores son nulos/vacíos)
function isEmptyRow(cells: unknown[]): boolean {
  return cells.every(
    (cell) => cell === null || cell === undefined || String(cell).trim() === "",
  );
}

// Parsea y convierte los campos numéricos al tipo correcto
function coerceTypes(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };

  for (const field of ["cost_price", "sell_price"]) {
    if (result[field] !== undefined && result[field] !== null && result[field] !== "") {
      const n = toNumber(result[field]);
      if (n !== null) result[field] = n;
    }
  }

  for (const field of ["stock_quantity", "min_stock_alert"]) {
    if (result[field] !== undefined && result[field] !== null && result[field] !== "") {
      const n = toNumber(result[field]);
      if (n !== null) result[field] = Math.trunc(n);
    }
  }

  return result;
}

/**
 * Parsea un archivo Excel y devuelve las filas mapeadas y validadas.
 * - Toma solo la primera hoja
 * - Soporta encabezados en español e inglés
 * - Limita a MAX_ROWS filas y MAX_FILE_SIZE bytes
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  // Validar tamaño antes de leer
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `El archivo supera el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024} MB`,
    );
  }

  // Importación dinámica para no inflar el bundle inicial
  const XLSX = await import("@e965/xlsx");

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Solo la primera hoja
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("El archivo no contiene hojas");
  }
  const sheet = workbook.Sheets[firstSheetName];

  // Obtener filas como arrays crudos (header: 1 = primera fila como array)
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  if (rawRows.length < 1) {
    return { rows: [], validCount: 0, invalidCount: 0, headers: [] };
  }

  // Primera fila = encabezados
  const headerRow = (rawRows[0] as unknown[]).map((h) =>
    normalizeHeader(String(h ?? "")),
  );

  // Mapear cada encabezado a su campo de producto
  const fieldMap = headerRow.map((h) => HEADER_MAP[h] ?? null);

  // Encabezados reconocidos para devolver al llamador
  const recognizedHeaders = [
    ...new Set(fieldMap.filter((f): f is string => f !== null)),
  ];

  const dataRows = rawRows.slice(1);

  if (dataRows.length > MAX_ROWS) {
    throw new Error(
      `El archivo supera el máximo de ${MAX_ROWS} filas de datos`,
    );
  }

  const rows: ParsedRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const cells = dataRows[i] as unknown[];

    // Ignorar filas completamente vacías
    if (isEmptyRow(cells)) continue;

    // Construir objeto mapeado con los campos reconocidos
    const rawData: Record<string, unknown> = {};

    for (let col = 0; col < fieldMap.length; col++) {
      const field = fieldMap[col];
      if (!field) continue;

      const cellValue = cells[col] ?? null;

      if (field === "barcodes") {
        // Parsear con la utilidad existente
        const raw = cellValue !== null ? String(cellValue) : "";
        rawData["barcodes"] = raw ? parseBarcodesInput(raw) : [];
      } else {
        rawData[field] = cellValue;
      }
    }

    // Convertir tipos numéricos antes de validar
    const data = coerceTypes(rawData);
    const errors = validateRow(data);

    rows.push({
      rowNumber: i + 2, // +2 porque fila 1 = encabezados, i arranca en 0
      data,
      valid: errors.length === 0,
      errors,
    });
  }

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  return {
    rows,
    validCount,
    invalidCount,
    headers: recognizedHeaders,
  };
}
