/**
 * Utilidad para generar y descargar la plantilla Excel de importación de productos.
 * Campos mapeados al tipo Product: name, description, category, barcodes,
 * cost_price, sell_price, stock_quantity, min_stock_alert
 */

export async function downloadTemplate(): Promise<void> {
  // Importación dinámica para no aumentar el bundle principal
  const XLSX = await import('@e965/xlsx');

  // Fila de encabezados en español, en el mismo orden que espera el parser
  const headers = [
    'Nombre',
    'Descripción',
    'Categoría',
    'Códigos de barras',
    'Precio costo',
    'Precio venta',
    'Stock',
    'Stock mínimo',
  ];

  // Fila de ejemplo con datos representativos
  const exampleRow = [
    'Coca Cola 500ml',
    'Gaseosa 500ml',
    'Bebidas',
    '7790895000218',
    800,
    1200,
    50,
    10,
  ];

  // Construir la hoja a partir del arreglo de arreglos
  const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  // Anchos de columna para mejor legibilidad (en caracteres)
  worksheet['!cols'] = [
    { wch: 25 }, // Nombre
    { wch: 30 }, // Descripción
    { wch: 15 }, // Categoría
    { wch: 20 }, // Códigos de barras
    { wch: 15 }, // Precio costo
    { wch: 15 }, // Precio venta
    { wch: 12 }, // Stock
    { wch: 12 }, // Stock mínimo
  ];

  // Crear el libro y agregar la hoja
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

  // Disparar la descarga en el navegador
  XLSX.writeFile(workbook, 'plantilla-productos.xlsx');
}
