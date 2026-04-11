import { useRef, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { useProducts } from "../../hooks/useProducts";
import { parseExcelFile, type ParseResult, type ParsedRow } from "../../utils/excelParser";
import { downloadTemplate } from "../../utils/excelTemplate";
import { formatCurrency } from "../../utils/formatters";

interface ExcelImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = "upload" | "preview" | "results";

interface ImportResult {
  created: number;
  failed: number;
  total: number;
  details: Array<{ row: number; name: string; success: boolean; error?: string }>;
}

function getRowName(row: ParsedRow): string {
  return String(row.data["name"] ?? "—");
}

function getRowCategory(row: ParsedRow): string {
  return String(row.data["category_name"] ?? "—");
}

function getRowSellPrice(row: ParsedRow): string {
  const val = row.data["sell_price"];
  if (val === undefined || val === null || val === "") return "—";
  return formatCurrency(Number(val));
}

function getRowStock(row: ParsedRow): string {
  const val = row.data["stock_quantity"];
  if (val === undefined || val === null || val === "") return "—";
  return String(val);
}

export default function ExcelImportModal({
  open,
  onClose,
  onImportComplete,
}: ExcelImportModalProps) {
  const { bulkCreate } = useProducts();

  const [step, setStep] = useState<Step>("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setStep("upload");
    setParseResult(null);
    setImportResult(null);
    setIsParsing(false);
    setIsImporting(false);
    setParseError(null);
    setIsDragging(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function isValidExtension(file: File): boolean {
    return /\.(xlsx|xls)$/i.test(file.name);
  }

  async function processFile(file: File) {
    if (!isValidExtension(file)) {
      setParseError("Solo se aceptan archivos .xlsx o .xls");
      return;
    }
    setParseError(null);
    setIsParsing(true);
    try {
      const result = await parseExcelFile(file);
      setParseResult(result);
      setStep("preview");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Error al procesar el archivo");
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleImport() {
    if (!parseResult) return;

    const validRows = parseResult.rows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    const products = validRows.map((row) => ({
      name: String(row.data["name"] ?? ""),
      description: row.data["description"] ? String(row.data["description"]) : undefined,
      category_name: row.data["category_name"] ? String(row.data["category_name"]) : undefined,
      cost_price: Number(row.data["cost_price"] ?? 0),
      sell_price: Number(row.data["sell_price"] ?? 0),
      stock_quantity: row.data["stock_quantity"] !== undefined && row.data["stock_quantity"] !== null && row.data["stock_quantity"] !== ""
        ? Number(row.data["stock_quantity"])
        : undefined,
      min_stock_alert: row.data["min_stock_alert"] !== undefined && row.data["min_stock_alert"] !== null && row.data["min_stock_alert"] !== ""
        ? Number(row.data["min_stock_alert"])
        : undefined,
    }));

    setIsImporting(true);
    const result = await bulkCreate(products);
    setIsImporting(false);

    if (result) {
      setImportResult(result);
      setStep("results");
    }
  }

  async function handleDownloadTemplate() {
    await downloadTemplate();
  }

  const validCount = parseResult?.validCount ?? 0;
  const invalidCount = parseResult?.invalidCount ?? 0;

  return (
    <Modal open={open} onClose={handleClose} title="Importar productos desde Excel" size="xl">
      {/* STEP 1: UPLOAD */}
      {step === "upload" && (
        <div className="flex flex-col gap-5">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-12 cursor-pointer transition-colors duration-150",
              isDragging
                ? "border-amber-500 bg-amber-500/10"
                : "border-surface-600 hover:border-surface-500 bg-surface-800/50",
            ].join(" ")}
          >
            {isParsing ? (
              <>
                <svg className="animate-spin h-10 w-10 text-amber-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-surface-300 text-sm">Procesando archivo...</span>
              </>
            ) : (
              <>
                <svg className="h-12 w-12 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <div className="text-center">
                  <p className="text-surface-200 font-medium">
                    Arrastrá un archivo .xlsx acá o hacé click para seleccionar
                  </p>
                  <p className="text-surface-400 text-sm mt-1">Máximo 5 MB · 1000 filas</p>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileInput}
          />

          {parseError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
              {parseError}
            </p>
          )}

          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Descargar plantilla
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === "preview" && parseResult && (
        <div className="flex flex-col gap-4">
          {/* Summary bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="success">{validCount} fila{validCount !== 1 ? "s" : ""} válida{validCount !== 1 ? "s" : ""}</Badge>
            {invalidCount > 0 && (
              <Badge variant="danger">{invalidCount} con error{invalidCount !== 1 ? "es" : ""}</Badge>
            )}
            <span className="text-surface-400 text-sm">{parseResult.rows.length} filas en total</span>
          </div>

          {/* Table */}
          <div className="overflow-auto rounded-lg border border-surface-700" style={{ maxHeight: "400px" }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-800 z-10">
                <tr>
                  <th className="text-left px-3 py-2.5 text-surface-400 font-medium border-b border-surface-700 w-14">Fila</th>
                  <th className="text-left px-3 py-2.5 text-surface-400 font-medium border-b border-surface-700">Nombre</th>
                  <th className="text-left px-3 py-2.5 text-surface-400 font-medium border-b border-surface-700">Categoría</th>
                  <th className="text-right px-3 py-2.5 text-surface-400 font-medium border-b border-surface-700">Precio venta</th>
                  <th className="text-right px-3 py-2.5 text-surface-400 font-medium border-b border-surface-700">Stock</th>
                  <th className="text-left px-3 py-2.5 text-surface-400 font-medium border-b border-surface-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {parseResult.rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={row.valid ? "hover:bg-surface-800/50" : "bg-red-500/5 hover:bg-red-500/10"}
                  >
                    <td className="px-3 py-2 text-surface-400 tabular-nums">{row.rowNumber}</td>
                    <td className="px-3 py-2 text-surface-200 max-w-[180px] truncate">{getRowName(row)}</td>
                    <td className="px-3 py-2 text-surface-300 max-w-[120px] truncate">{getRowCategory(row)}</td>
                    <td className="px-3 py-2 text-surface-300 text-right tabular-nums">{getRowSellPrice(row)}</td>
                    <td className="px-3 py-2 text-surface-300 text-right tabular-nums">{getRowStock(row)}</td>
                    <td className="px-3 py-2">
                      {row.valid ? (
                        <Badge variant="success">OK</Badge>
                      ) : (
                        <Badge variant="danger" className="max-w-[200px] truncate block">
                          {row.errors[0]}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <Button variant="secondary" onClick={() => setStep("upload")}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={validCount === 0}
              loading={isImporting}
              onClick={handleImport}
            >
              Importar {validCount} producto{validCount !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS */}
      {step === "results" && importResult && (
        <div className="flex flex-col gap-5">
          {/* Summary cards */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[140px] rounded-xl bg-teal-500/10 border border-teal-500/20 px-5 py-4">
              <p className="text-surface-400 text-sm">Creados</p>
              <p className="text-3xl font-bold text-teal-400 mt-1">{importResult.created}</p>
            </div>
            {importResult.failed > 0 && (
              <div className="flex-1 min-w-[140px] rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4">
                <p className="text-surface-400 text-sm">Fallidos</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{importResult.failed}</p>
              </div>
            )}
          </div>

          {/* Failure list */}
          {importResult.failed > 0 && (
            <div className="rounded-lg border border-surface-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-800 border-b border-surface-700">
                <span className="text-surface-300 text-sm font-medium">Detalle de errores</span>
              </div>
              <div className="overflow-auto" style={{ maxHeight: "220px" }}>
                {importResult.details
                  .filter((d) => !d.success)
                  .map((d) => (
                    <div
                      key={d.row}
                      className="flex items-start gap-3 px-4 py-2.5 border-b border-surface-700/50 last:border-0"
                    >
                      <span className="text-surface-500 text-sm tabular-nums shrink-0 pt-px">Fila {d.row}</span>
                      <span className="text-surface-300 text-sm truncate shrink-0 max-w-[160px]">{d.name}</span>
                      <span className="text-red-400 text-sm">{d.error ?? "Error desconocido"}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              variant="primary"
              onClick={() => {
                onImportComplete();
                handleClose();
              }}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
