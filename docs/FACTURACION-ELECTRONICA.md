# Facturación Electrónica (ARCA / AFIP)

Documentación técnica de la integración de facturación electrónica de StockFlow contra los WebServices de **ARCA / AFIP** (Argentina).

---

## 1. Resumen

- **Autoridad fiscal:** ARCA / AFIP (Argentina) — WSFEv1.
- **Tipo de comprobante emitido:** Factura C (`cbteTipo = 11`), receptor consumidor final.
- **Modelo de emisión:** asíncrono *fire-and-forget* tras la creación de la venta, con barrido (sweep) de reintentos en background.
- **Autenticación:** WSAA con firma PKCS#7 (X.509 + clave privada PEM) y token cacheado en base de datos.
- **Estado actual:** infraestructura de obtención de CAE completa. **No** se generan PDF, ni XML de factura con detalle de ítems, ni QR fiscal, ni otros tipos de comprobante (boleta, NC/ND).

---

## 2. Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                          API REST                            │
│   POST /api/sales      POST /api/sales/:id/retry-invoice     │
│   GET  /api/sales      GET  /api/sales/:id                   │
└──────────────┬─────────────────────────────────┬─────────────┘
               │                                 │
               ▼                                 ▼
┌──────────────────────────────┐   ┌─────────────────────────────┐
│  controllers/sales.js        │   │  controllers/mercadopago.js │
│  • createSale                │   │  • createSaleFromPending…   │
│  • retryInvoice              │   │    (webhook MP → venta)     │
└──────────────┬───────────────┘   └─────────────┬───────────────┘
               │   fire-and-forget               │
               ▼                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                services/arca/  (módulo ARCA)                 │
│  index.js   → emitInvoice(saleId, total)                     │
│  invoice.js → requestCAE  (FECompUltimoAutorizado + FECAE)   │
│  token.js   → getValidToken (WSAA + PKCS#7 + cache DB)       │
│  client.js  → getWsaaClient / getWsfeClient (SOAP)           │
│  config.js  → getArcaConfig (env vars, enabled flag)         │
│  sweep.js   → startArcaSweep (retry job cada 15 min)         │
└──────────┬──────────────┬─────────────────────┬──────────────┘
           ▼              ▼                     ▼
       PostgreSQL     AFIP WS              node-forge
   (sales,           (WSAA / WSFEv1)       (firma PKCS#7)
    arca_tokens)
```

---

## 3. Variables de entorno

Configuradas en `backend/services/arca/config.js`. Si **falta cualquiera**, la integración queda deshabilitada (`enabled = false`) y las ventas se crean con `invoice_status = 'disabled'`.

| Variable          | Obligatoria | Descripción                                                  |
| ----------------- | ----------- | ------------------------------------------------------------ |
| `ARCA_CUIT`       | Sí          | CUIT del emisor.                                             |
| `ARCA_CERT_PEM`   | Sí          | Certificado X.509 en PEM (multilínea).                       |
| `ARCA_PRIVATE_KEY`| Sí          | Clave privada en PEM.                                        |
| `ARCA_PTO_VENTA`  | Sí          | Punto de venta habilitado en AFIP.                           |
| `ARCA_ENV`        | Sí          | `homo` (homologación) o `prod` (producción).                 |

Endpoints WSDL (en `client.js`):

| Servicio | Homologación                                                  | Producción                                                       |
| -------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| WSAA     | `https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl`      | `https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl`             |
| WSFEv1   | `https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL`        | `https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL`        |

---

## 4. Esquema de base de datos

Migración: `backend/migrations/001_arca_invoicing.sql`.

### 4.1 Columnas agregadas a `sales`

| Columna                | Tipo            | Notas                                                        |
| ---------------------- | --------------- | ------------------------------------------------------------ |
| `invoice_status`       | TEXT            | `'disabled' \| 'pending' \| 'success' \| 'failed'` (default `disabled`). |
| `invoice_cae`          | TEXT            | CAE devuelto por AFIP.                                       |
| `invoice_cae_expiry`   | DATE            | Vencimiento del CAE.                                         |
| `invoice_number`       | INTEGER         | Número de comprobante asignado.                              |
| `invoice_error`        | TEXT            | Último error reportado por AFIP (si `failed`).               |
| `invoice_retry_count`  | INTEGER         | Contador de reintentos (default 0, máx. 5).                  |
| `invoice_emitted_at`   | TIMESTAMPTZ     | Marca de éxito.                                              |

Índice parcial para el sweep:

```sql
CREATE INDEX idx_sales_invoice_failed ON sales (invoice_status)
  WHERE invoice_status = 'failed';
```

### 4.2 Tabla `arca_tokens`

Cache del par `token`/`sign` entregado por WSAA.

```sql
CREATE TABLE arca_tokens (
  id          SERIAL PRIMARY KEY,
  service     TEXT NOT NULL DEFAULT 'wsfe',
  token       TEXT NOT NULL,
  sign        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service)
);
```

---

## 5. Módulo `backend/services/arca/`

### 5.1 `config.js`
- `getArcaConfig()` — lee env vars y devuelve `{ enabled, cuit, certPem, privateKey, ptoVenta, env }`.

### 5.2 `client.js`
- `getWsaaClient(config)` y `getWsfeClient(config)` — instancian y cachean clientes SOAP (`soap` npm) según `ARCA_ENV`.

### 5.3 `token.js`
- `buildLoginTicketRequest(env)` — XML de login con vigencia 12 h.
- `signWithCMS(xml, certPem, privateKeyPem)` — firma PKCS#7 con `node-forge` (SHA-1, base64 de DER).
- `requestToken(config)` — invoca `loginCms` en WSAA y parsea `<token>` y `<sign>`.
- `getValidToken(config)` — busca un token vigente en `arca_tokens` (con buffer de 5 min); si no hay, pide uno nuevo y lo persiste.

### 5.4 `invoice.js`
- `requestCAE(saleId, totalAmount)` — flujo principal:
  1. Verifica que la integración esté habilitada.
  2. Adquiere `pg_advisory_lock(20250415)` para serializar pedidos de CAE.
  3. `FECompUltimoAutorizadoAsync` → último número autorizado para `(ptoVenta, cbteTipo=11)`.
  4. Construye el request `FECAESolicitar` con:
     - `Concepto = 1` (productos/servicios)
     - `DocTipo = 99`, `DocNro = 0` (sin identificar)
     - `CondicionIVAReceptorId = 5` (consumidor final)
     - `MonId = 'PES'`, `MonCotiz = 1`
     - `ImpTotal = totalAmount`
  5. Devuelve `{ cae, caeExpiry, invoiceNumber }` o `{ skipped: true }`.

### 5.5 `index.js`
- `emitInvoice(saleId, totalAmount)` — orquesta:
  1. `UPDATE sales SET invoice_status = 'pending'`.
  2. Llama `requestCAE`.
  3. En éxito → `invoice_status = 'success'` + CAE/expiry/number/`invoice_emitted_at`.
  4. En error → `invoice_status = 'failed'` + `invoice_error` + `invoice_retry_count += 1`.
  - **Nunca** lanza al caller (uso *fire-and-forget*).

### 5.6 `sweep.js`
- `startArcaSweep()` — arranca un `setInterval` cada **15 minutos** (invocado desde `backend/index.js` al boot).
- Cada corrida (`runSweep`):
  - Selecciona hasta **50** ventas con `invoice_status = 'failed'` y `invoice_retry_count < 5`, ordenadas por antigüedad.
  - Aplica backoff exponencial `min(2^retry_count, 30)` segundos antes de reintentar.
  - Llama `emitInvoice` para cada una.

---

## 6. Endpoints HTTP

Definidos en `backend/routes/sales.js` y montados en `/api/sales` (ver `backend/app.js`).

| Método | Ruta                              | Auth        | Descripción                                                                  |
| ------ | --------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| POST   | `/api/sales`                      | autenticado | Crea la venta y dispara `emitInvoice` async si ARCA está habilitado.         |
| GET    | `/api/sales`                      | autenticado | Lista ventas con todos los campos `invoice_*`.                               |
| GET    | `/api/sales/:id`                  | autenticado | Detalle de venta con datos de facturación.                                   |
| POST   | `/api/sales/:id/retry-invoice`    | admin       | Reintento manual de facturación. Rechaza si `success` o ARCA deshabilitado.  |

Disparo asíncrono en `controllers/sales.js`:

```js
if (getArcaConfig().enabled) {
  emitInvoice(result.id, Number(result.total_amount)).catch((err) => {
    console.error(`[ARCA] Unhandled error in emitInvoice for sale #${result.id}:`, err);
  });
}
```

El mismo patrón se usa en `controllers/mercadopago.js → createSaleFromPendingOrder` cuando un webhook de MercadoPago confirma el pago.

---

## 7. Frontend

### 7.1 `client/src/components/sales/InvoiceBadge.tsx`

Componente visual con cuatro estados:

| `status`   | Render                                                              |
| ---------- | ------------------------------------------------------------------- |
| `success`  | Badge verde "Facturado" con CAE, número (8 dígitos) y vencimiento.  |
| `pending`  | Badge amarillo "Facturando…".                                       |
| `failed`   | Badge rojo "Factura pendiente" + botón **Reintentar** (solo admin). |
| `disabled` | No renderiza nada.                                                  |

### 7.2 `client/src/components/cash-register/CashRegisterDetailModal.tsx`

- Renderiza `InvoiceBadge` por venta.
- `handleRetryInvoice(saleId)` → `POST /api/sales/:id/retry-invoice` y actualiza el estado local.
- Pasa `isAdmin` para condicionar el botón de reintento.

### 7.3 Tipos (`client/src/types/index.ts`)

```ts
export type InvoiceStatus = "disabled" | "pending" | "success" | "failed";

export interface Sale {
  id: number;
  /* ... */
  invoice_status?: InvoiceStatus | null;
  invoice_cae?: string | null;
  invoice_cae_expiry?: string | null;
  invoice_number?: number | null;
  invoice_error?: string | null;
  invoice_retry_count?: number;
  invoice_emitted_at?: string | null;
}
```

---

## 8. Flujos completos

### 8.1 Venta directa con facturación
1. `POST /api/sales` → `createSale` valida (Zod), abre transacción, inserta `sales`, `sale_items`, `sale_payments` y movimientos de stock.
2. Responde 201 con la venta.
3. En paralelo (sin `await` en la respuesta) corre `emitInvoice`:
   - `pending` → `requestCAE` (WSAA + WSFE) → `success` o `failed`.

### 8.2 Webhook MercadoPago → venta → facturación
1. `POST /api/mp/webhook` valida HMAC y responde 200.
2. `processMerchantOrder` consulta MP; si está pago, `createSaleFromPendingOrder` crea la venta.
3. Dispara `emitInvoice` con el mismo patrón fire-and-forget.

### 8.3 Reintento manual
1. Admin hace clic en **Reintentar** desde el modal de caja.
2. `POST /api/sales/:id/retry-invoice` → `retryInvoice` valida estado y vuelve a llamar `emitInvoice` **sincrónicamente** (espera resultado).
3. Devuelve 200 con CAE, o 422 con `invoice_error`.

### 8.4 Sweep de reintentos
1. `startArcaSweep()` arranca al boot del servidor.
2. Cada 15 min recorre hasta 50 ventas en `failed` con `retry_count < 5`, aplica backoff y reintenta.

---

## 9. Manejo de errores

| Escenario                        | `invoice_status` | Reintentos       | Notas                                            |
| -------------------------------- | ---------------- | ---------------- | ------------------------------------------------ |
| ARCA deshabilitado (env faltante)| `disabled`       | —                | No se intenta emitir.                            |
| Falla WSAA (cert, CUIT, red)     | `failed`         | Hasta 5 (sweep)  | Error guardado en `invoice_error`.               |
| Falla WSFE (rechazo AFIP)        | `failed`         | Hasta 5 (sweep)  | Backoff exponencial.                             |
| Pedido concurrente de CAE        | Prevenido        | —                | `pg_advisory_lock(20250415)`.                    |

Logging: todas las trazas usan prefijo `[ARCA]`.

---

## 10. Dependencias relevantes

`backend/package.json`:
- `soap` — cliente SOAP para WSAA/WSFE.
- `node-forge` — firma PKCS#7 y manejo de PEM.
- `pg` — PostgreSQL (advisory lock + persistencia).

---

## 11. Limitaciones conocidas / pendientes

- No se genera **XML detallado** ni **PDF** del comprobante: AFIP otorga el CAE pero no se materializa la factura para entrega al cliente.
- No se genera **QR fiscal** ni se firma el PDF.
- Solo se emite **Factura C** a consumidor final. No hay soporte para Factura A/B, notas de crédito/débito, ni boletas.
- No hay endpoint de consulta/anulación contra AFIP (`FECompConsultar`, etc.).
- No hay tests para el módulo ARCA (`backend/tests/` cubre ventas pero no facturación).
- No se valida el formato de número de comprobante con reglas estrictas de AFIP más allá del incremento sobre `FECompUltimoAutorizado`.

---

## 12. Tabla de archivos clave

| Archivo                                                              | Rol                                              |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| `backend/services/arca/config.js`                                    | Carga de configuración                           |
| `backend/services/arca/client.js`                                    | Clientes SOAP cacheados                          |
| `backend/services/arca/token.js`                                     | Token WSAA + firma PKCS#7                        |
| `backend/services/arca/invoice.js`                                   | Pedido de CAE (`FECAESolicitar`)                 |
| `backend/services/arca/index.js`                                     | Orquestación `emitInvoice`                       |
| `backend/services/arca/sweep.js`                                     | Job de reintentos                                |
| `backend/controllers/sales.js`                                       | Endpoints de ventas + retry                      |
| `backend/controllers/mercadopago.js`                                 | Emisión tras pago confirmado por MP              |
| `backend/routes/sales.js`                                            | Definición de rutas                              |
| `backend/migrations/001_arca_invoicing.sql`                          | Esquema (`sales.invoice_*`, `arca_tokens`)       |
| `client/src/components/sales/InvoiceBadge.tsx`                       | Badge de estado en UI                            |
| `client/src/components/cash-register/CashRegisterDetailModal.tsx`    | UI de reintento desde modal de caja              |
| `client/src/types/index.ts`                                          | `InvoiceStatus`, campos en `Sale`                |
