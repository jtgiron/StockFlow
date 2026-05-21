# Mercado Pago QR estático, cierre técnico pendiente

Mercado Pago **ya está integrado en el flujo base** de StockFlow. Este checklist no es para "arrancar MP desde cero", sino para cerrar los gaps que todavía impiden llamarlo completamente robusto para producción.

## Quick path

1. Corregir schema y bootstrap de DB para que un entorno limpio levante MP sin parches manuales.
2. Documentar y validar la configuración requerida (`.env.example` + startup checks).
3. Endurecer webhook, pagos mixtos y expiración de órdenes.
4. Cubrir los casos críticos con tests de integración y regresión.

## Estado confirmado hoy

| Área                            | Estado       | Evidencia                                                                |
| ------------------------------- | ------------ | ------------------------------------------------------------------------ |
| OAuth comercio                  | Implementado | `backend/controllers/mpOauth.js`, `backend/routes/mercadopago.js`        |
| Alta Store/POS                  | Implementado | `backend/controllers/mpOauth.js`                                         |
| Orden QR desde POS              | Implementado | `backend/controllers/mercadopago.js#createOrder`                         |
| Espera/polling frontend         | Implementado | `client/src/components/pos/PaymentModal.tsx`                             |
| Webhook público                 | Implementado | `backend/controllers/mercadopago.js#webhook`                             |
| Creación automática de venta    | Implementado | `backend/controllers/mercadopago.js#createSaleFromPendingOrder`          |
| Pago `mercadopago` en venta     | Implementado | `backend/controllers/mercadopago.js`, `sale_payments`                    |
| Disparo de ARCA luego del cobro | Implementado | `backend/controllers/mercadopago.js`, `backend/services/arca/invoice.js` |

## Gaps confirmados

### 1. Schema y bootstrap

- [x] **Corregir `mp_pending_orders`**
  - Hecho en `init-scripts/004-mp-pending-orders.sql`.
  - Ahora la tabla define `merchant_id` e índice asociado.

- [x] **Agregar migración base de `mp_merchants`**
  - Hecho en `init-scripts/007-create-mp-merchants.sql`.
  - La migración crea la tabla base y agrega la FK desde `mp_pending_orders` cuando corresponde.

### 2. Configuración y seguridad

- [x] **Completar `backend/.env.example`**
  - Hecho: se documentaron `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_REDIRECT_URI`, `MP_NOTIFICATION_URL`, `MP_WEBHOOK_SECRET`, `MP_SPONSOR_ID` y `MP_ORDER_TIMEOUT_MINUTES`.

- [x] **Agregar validación de startup para configuración parcial**
  - Hecho en `backend/config/runtime.js` + `backend/index.js`.
  - Si MP o ARCA están parcialmente configurados, se avisa en desarrollo y se falla en producción.

- [ ] **Confirmar política de firma webhook**
  - Hoy hay validación condicional si `MP_WEBHOOK_SECRET` existe.
  - Definir si en producción debe ser obligatoria.

### 3. Comportamiento funcional

- [x] **Definir pagos mixtos**
  - Política actual: **quedan bloqueados explícitamente** cuando interviene Mercado Pago.
  - Evidencia: `client/src/components/pos/PaymentModal.tsx`, `backend/controllers/sales.js`.

- [x] **Resolver expiración desde backend en el endpoint de estado**
  - `GET /api/mp/order-status/:externalReference` ahora devuelve `expired` según timeout configurable.
  - Pendiente todavía: limpieza operacional/persistencia de órdenes vencidas.

- [ ] **Alinear flujo MP con productos fraccionales / por peso**
  - La venta estándar y la venta creada desde webhook no parecen tratar exactamente igual este caso.

- [ ] **Cerrar multi-merchant real**
  - Mejorado: `merchant_order` ya intenta resolver token por `mp_order_id` + `merchant_id`.
  - Pendiente: terminar de endurecer escenarios avanzados y fallback de notificaciones `payment`.

### 4. Observabilidad y operación

- [ ] **Agregar logs estructurados mínimos**
  - Campos sugeridos: `external_reference`, `merchant_id`, `cash_register_id`, `mp_payment_id`, `status`, `source`.

- [ ] **Definir runbook operativo**
  - Qué hacer si el webhook llega tarde.
  - Qué hacer si la orden queda pendiente.
  - Qué hacer si el cliente pagó pero la venta no se creó.

- [ ] **Agregar métricas básicas**
  - `mp_orders_created`
  - `mp_orders_completed`
  - `mp_orders_cancelled`
  - `mp_orders_expired`
  - `mp_webhook_invalid_signature`
  - `mp_sale_creation_failures`

## Checklist de verificación

### Alta prioridad

- [ ] Una DB nueva levanta MP sin SQL manual fuera del repo.
- [ ] `create-order` funciona en un entorno limpio.
- [ ] Webhook duplicado no genera doble venta.
- [ ] Webhook con firma inválida no procesa nada.
- [ ] El comportamiento de pagos mixtos está definido y testeado.
  - Definición actual: bloqueados explícitamente.

### Media prioridad

- [ ] Las órdenes expiran de forma consistente en backend/frontend.
- [ ] Caja y reportes muestran cobros MP correctamente.
- [ ] Productos por peso no rompen stock ni subtotales en flujo MP.
- [ ] Multi-merchant queda soportado o explícitamente fuera de alcance.

### Baja prioridad

- [ ] Hay métricas operativas básicas.
- [ ] Existe runbook de soporte para sucursal.

## Evidencia principal a revisar

1. `backend/controllers/mercadopago.js`
2. `backend/controllers/mpOauth.js`
3. `client/src/components/pos/PaymentModal.tsx`
4. `init-scripts/004-mp-pending-orders.sql`
5. `backend/.env.example`

## Done real para considerar MP “cerrado”

- [ ] Bootstrap reproducible de DB y config.
- [ ] Webhook y órdenes pendientes son idempotentes y auditables.
- [ ] Política de pagos mixtos definida y consistente.
- [ ] Reportes/caja reflejan MP sin ambigüedad.
- [ ] Los casos críticos tienen tests automatizados.
