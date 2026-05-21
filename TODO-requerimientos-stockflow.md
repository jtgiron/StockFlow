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

- [x] Integrar Mercado Pago con QR estático (flujo base implementado).
      Hecho: OAuth de comercio, alta de Store/POS, creacion de orden QR, polling desde POS, webhook publico y creacion automatica de venta/pago `mercadopago` al aprobarse el cobro.

- [ ] Hardening de Mercado Pago para produccion.
      Que falta: cerrar gaps de schema/config, pagos mixtos, expiracion automatica, pruebas, observabilidad y consistencia operacional.

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

- [x] Agregar pruebas de integracion para flujos criticos.
      Hecho: tests de integracion con Vitest + Supertest para ventas, stock, caja y listas de precios en `backend/tests/`.

- [x] Completar endpoints faltantes de productos.
      Hecho: barcode search, toggle-active, delete (soft/hard), bulk create.

## Orden sugerido de implementacion

1. ~~Base operativa: ventas + caja + stock transaccional.~~ DONE
2. ~~Fiados y metodos de pago completos.~~ DONE
3. ~~Listas de precios y aplicacion masiva.~~ DONE
4. ~~Reportes consolidados.~~ DONE
5. ~~Hardening: permisos finos, pruebas, estandar de errores.~~ DONE (MercadoPago base integrado, falta hardening)

## 9) Mercado Pago QR estatico - estado real y hardening pendiente

Estado actual: **Mercado Pago ya esta integrado en su flujo base**. Hoy StockFlow puede conectar una cuenta, crear Store/POS, generar una orden QR estatica, esperar webhook y crear la venta automaticamente cuando el cobro se aprueba. Lo pendiente ya no es “integrar MP”, sino **cerrar gaps de robustez para produccion**.

### 9.1 Ya implementado

- [x] OAuth de Mercado Pago para conectar comercios.
      Evidencia: `backend/controllers/mpOauth.js`, `backend/routes/mercadopago.js`.

- [x] Alta automatica de Store/POS y guardado de QR estatico.
      Evidencia: `backend/controllers/mpOauth.js`, `client/src/pages/SettingsPage.tsx`, `mp/caja.json`, `mp/sucursal.json`.

- [x] Creacion de orden QR desde el POS.
      Evidencia: `backend/controllers/mercadopago.js#createOrder`, `client/src/hooks/useSales.ts`.

- [x] Polling de estado y pantalla de espera en frontend.
      Evidencia: `client/src/components/pos/PaymentModal.tsx`.

- [x] Webhook publico para confirmar cobros y crear la venta.
      Evidencia: `backend/controllers/mercadopago.js#webhook`, `createSaleFromPendingOrder()`.

- [x] Registro del pago `mercadopago` y disparo de ARCA luego de crear la venta.
      Evidencia: `backend/controllers/mercadopago.js`, `backend/services/arca/invoice.js`.

### 9.2 Gaps confirmados a cerrar

- [x] Corregir drift de base de datos en `mp_pending_orders`.
      Hecho: `init-scripts/004-mp-pending-orders.sql` ahora define `merchant_id` e indice asociado.

- [x] Agregar migracion base de `mp_merchants` al repo.
      Hecho: `init-scripts/007-create-mp-merchants.sql` crea la tabla y agrega la FK desde `mp_pending_orders` cuando corresponde.

- [x] Completar `backend/.env.example` con variables MP reales.
      Hecho: se documentaron `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_REDIRECT_URI`, `MP_NOTIFICATION_URL`, `MP_WEBHOOK_SECRET`, `MP_SPONSOR_ID` y `MP_ORDER_TIMEOUT_MINUTES`.

- [x] Definir politica transitoria de pagos mixtos con MP.
      Hecho: quedan bloqueados explicitamente en frontend y backend hasta implementar soporte real. Evidencia: `client/src/components/pos/PaymentModal.tsx`, `backend/controllers/sales.js`.

- [x] Resolver expiracion desde backend en el endpoint de estado.
      Hecho: `GET /api/mp/order-status/:externalReference` devuelve `expired` segun timeout backend configurable.

- [ ] Alinear flujo MP con productos por peso/fraccionales.
      La venta normal contempla diferencias de stock para productos por peso; el camino de webhook MP no parece mantener esa misma logica extremo a extremo.

- [x] Mejorar la asociacion de webhook por comercio para `merchant_order`.
      Hecho: el token ahora se resuelve por `mp_order_id`/`merchant_id` cuando existe y cae al merchant activo como fallback.

- [ ] Cerrar el caso multi-merchant restante para notificaciones `payment` y operacion avanzada.
      Aun queda fallback al merchant activo en escenarios donde no se puede resolver el merchant por la orden pendiente.

### 9.3 Checklist tecnico de cierre

#### Prioridad alta

- [ ] Probar bootstrap limpio con las nuevas migraciones (`mp_pending_orders`, `mp_merchants`).
- [x] Documentar/env-check de configuracion MP.
- [ ] Cubrir webhook duplicado, firma invalida y error de creacion de venta.
- [x] Definir si StockFlow soporta pagos mixtos con MP ahora o los bloquea explicitamente.

#### Prioridad media

- [ ] Expiracion automatica + limpieza operacional de ordenes pendientes.
- [ ] Auditoria/logs estructurados por `external_reference`, `merchant_id`, `mp_payment_id`.
- [ ] Tests de regresion para caja/reportes con pagos MP.
- [ ] Validar stock/productos fraccionales en flujo MP.

#### Prioridad baja

- [ ] Metricas operativas del flujo MP.
- [ ] Runbook de soporte para sucursal ante webhook demorado o venta pendiente.

### 9.4 Criterios para dar MP por cerrado

- [ ] Un entorno limpio puede levantar la integracion sin cambios manuales de DB.
- [ ] La configuracion requerida esta documentada y validada al iniciar.
- [ ] Webhooks duplicados o invalidos no generan doble imputacion.
- [ ] El sistema define explicitamente pagos mixtos: soportados correctamente o bloqueados con mensaje claro.
- [ ] Caja/reportes reflejan correctamente cobros MP sin inconsistencias.

## 10) Facturacion ARCA / WSFE - estado actual

Estado actual: **ARCA ya esta integrada** para ventas normales y ventas creadas desde Mercado Pago. La emision corre en segundo plano, persiste estado sobre `sales`, tiene reintentos automaticos y permite retry manual para admin.

### 10.1 Ya implementado

- [x] Emision de comprobante ARCA luego de crear una venta normal.
      Evidencia: `backend/controllers/sales.js`, `backend/services/arca/invoice.js`.

- [x] Emision de comprobante ARCA luego de una venta creada por webhook de Mercado Pago.
      Evidencia: `backend/controllers/mercadopago.js`, `backend/services/arca/invoice.js`.

- [x] Persistencia de estado de factura en tabla `sales`.
      Evidencia: `backend/migrations/001_arca_invoicing.sql`.

- [x] Retry automatico en background.
      Evidencia: `backend/services/arca/sweep.js`, `backend/index.js`.

- [x] Retry manual para administradores.
      Evidencia: `POST /api/sales/:id/retry-invoice` en `backend/controllers/sales.js`.

### 10.2 Hardening pendiente

- [ ] Agregar pruebas automatizadas especificas para ARCA/WSFE.
      Hoy no quedo cubierto el camino de emision real ni los errores del servicio.

- [ ] Decidir si la factura seguira siendo minima o si debe enriquecerse con mas datos de la venta.
      Hoy `requestCAE()` emite una Factura C basica con consumidor final generico y total consolidado.

- [ ] Documentar configuracion requerida de ARCA en `.env.example` o guia operativa.
      Variables observadas: `ARCA_CUIT`, `ARCA_CERT_PEM`, `ARCA_PRIVATE_KEY`, `ARCA_PTO_VENTA`, `ARCA_ENV`.
