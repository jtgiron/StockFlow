# TODO de Requerimientos - StockFlow

Este documento resume lo que falta para cumplir los requerimientos funcionales del sistema.

## 1) Sistema de usuarios y accesos

- [x] Definir matriz de permisos por rol (admin y empleado).
      Hecho: middleware `authorize(...roles)` en `backend/middlewares/auth.js`. Admin: acceso total. Employee: POS, stock, caja, consultas.

- [x] Aplicar autorizacion por endpoint en backend.
      Hecho: cada ruta usa `authenticate` + `authorize('admin')` donde corresponde (users, categories, reports, price-lists solo admin).

- [x] Unificar reglas de acceso entre frontend y backend.
      Hecho: frontend usa `ProtectedRoute` con `allowedRoles`, backend bloquea con middleware `authorize`.

## 2) Gestion de stock

- [x] Crear modulo de movimientos de stock (entrada, salida, ajuste) en backend.
      Hecho: `controllers/stock.js` con endpoints GET/POST movimientos, trazabilidad completa (usuario, fecha, tipo, motivo).

- [x] Actualizar stock automaticamente al vender.
      Hecho: `controllers/sales.js` descuenta stock dentro de transaccion atomica y crea movimiento tipo 'exit'.

- [x] Implementar alerta de stock minimo desde backend.
      Hecho: endpoint GET `/api/stock/low-stock` retorna productos bajo minimo.

- [x] Completar busqueda real por codigo de barras.
      Hecho: endpoint GET `/api/products/barcode/:barcode` busca en barcode principal y array barcodes.

- [x] Incorporar reporte de productos mas vendidos.
      Hecho: endpoint GET `/api/reports/sales-summary` incluye top_products por cantidad y revenue.

## 3) Punto de venta (POS)

- [x] Implementar backend de ventas (cabecera, items, pagos).
      Hecho: `controllers/sales.js` con POST /sales (crea venta + items + pagos), GET /sales, GET /sales/:id.

- [x] Ejecutar venta con transaccion atomica.
      Hecho: `withTransaction()` envuelve creacion de venta + items + stock + fiado en una sola transaccion.

- [x] Validar metodos de pago multiples.
      Hecho: modelo sale_payments soporta cash, card, qr, mercadopago, credit. Array de pagos en POST /sales.

- [ ] Integrar QR/MercadoPago real (actualmente pendiente).
      Que hacer: conectar flujo de cobro externo, guardar referencia de transaccion y manejar estados de aprobacion/rechazo.

## 4) Gestion de caja

- [x] Crear endpoints de caja: apertura, cierre, turno actual e historial.
      Hecho: `controllers/cashRegisters.js` con GET /current, POST /open, POST /:id/close, GET / (historial).

- [x] Calcular esperado vs real por medio de pago.
      Hecho: al cierre se calcula expected_cash y expected_qr desde sale_payments y se compara con declarado.

- [x] Relacionar caja con ventas del turno.
      Hecho: toda venta requiere cash_register_id valido y abierto.

- [x] Generar reportes detallados de caja.
      Hecho: historial con esperado/real/diferencia por turno, reportes via /reports/sales-summary.

## 5) Fiados (creditos)

- [x] Crear modulo backend de cuentas corrientes de clientes.
      Hecho: `controllers/credits.js` con CRUD de cuentas (nombre, telefono, saldo, activo/inactivo).

- [x] Registrar cargos y pagos de fiado con historial.
      Hecho: cargos automaticos al vender como fiado, pagos via POST /accounts/:id/payments, historial de transacciones.

- [x] Definir reglas de negocio de credito.
      Hecho: toggle activo/inactivo, saldo calculado, cuenta inactiva bloqueada para pagos.

## 6) Reportes

- [x] Implementar endpoint de resumen de ventas por fecha.
      Hecho: GET /reports/sales-summary?from=&to= con ventas diarias, totales, ticket promedio.

- [x] Implementar top productos y desglose por metodo de pago.
      Hecho: top_products y payment_breakdown en el mismo endpoint de reportes.

- [x] Agregar reportes de caja y fiados.
      Hecho: historial de caja con montos esperados/reales, transacciones de credito con historial.

## 7) Actualizacion de listas de precios

- [x] Crear backend de listas de precios (CRUD de listas e items).
      Hecho: `controllers/priceLists.js` con CRUD listas, CRUD items por lista.

- [x] Implementar aplicacion masiva de lista sobre productos.
      Hecho: POST /price-lists/:id/apply actualiza precios de todos los items en una transaccion.

- [x] Guardar trazabilidad de cambios de precio.
      Hecho: tabla price_change_log registra who, when, old_price, new_price por cada cambio.

## 8) Integracion y calidad tecnica

- [x] Alinear contratos frontend-backend.
      Hecho: todos los endpoints que el frontend consume en hooks ahora existen en backend con payloads compatibles.

- [x] Estandarizar validaciones y errores de API.
      Hecho: clase AppError + errorHandler global centralizado, codigos HTTP consistentes.

- [ ] Agregar pruebas de integracion para flujos criticos.
      Que hacer: testear al menos venta completa, cierre de caja, movimiento de stock y aplicacion de lista de precios.

- [x] Completar endpoints faltantes de productos.
      Hecho: barcode search, toggle-active, delete (soft/hard), bulk create.

## Orden sugerido de implementacion

1. ~~Base operativa: ventas + caja + stock transaccional.~~ DONE
2. ~~Fiados y metodos de pago completos.~~ DONE
3. ~~Listas de precios y aplicacion masiva.~~ DONE
4. ~~Reportes consolidados.~~ DONE
5. ~~Hardening: permisos finos, pruebas, estandar de errores.~~ DONE (excepto pruebas de integracion y MercadoPago)
