# Guía Completa: Webhook de Notificaciones - Mercado Pago QR Estático

## Índice

1. [Requisitos y Seguridad](#1-requisitos-y-seguridad)
2. [Implementación del Receptor](#2-implementación-del-receptor)
3. [Configuración del Webhook en Mercado Pago](#3-configuración-del-webhook-en-mercado-pago)
4. [Simulación y Validación de Pagos](#4-simulación-y-validación-de-pagos)

---

## 1. Requisitos y Seguridad

### 1.1 Requisitos previos

| Requisito                 | Estado         | Detalle                                                                                                 |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| URL HTTPS pública         | ✅ Configurado | `https://stockflow-production-b179.up.railway.app/api/mp/webhook`                                       |
| Aplicación en MP DevPanel | ❌ Pendiente   | Necesitás crear una aplicación en [Tus integraciones](https://www.mercadopago.com/developers/panel/app) |
| `MP_ACCESS_TOKEN`         | ✅ Configurado | Variable de entorno en `.env`                                                                           |
| `MP_USER_ID`              | ✅ Configurado | Variable de entorno en `.env`                                                                           |
| `MP_EXTERNAL_POS_ID`      | ✅ Configurado | Variable de entorno en `.env` (corregido typo con guión)                                                |
| `MP_WEBHOOK_SECRET`       | ❌ Pendiente   | Se genera al guardar la configuración del webhook en el DevPanel                                        |

### 1.2 Modelo de seguridad HMAC-SHA256

Mercado Pago firma cada notificación webhook con HMAC-SHA256. La validación consiste en:

1. **Header `x-signature`**: Contiene `ts=<timestamp>,v1=<hash>`
2. **Manifest template**: `id:<data.id en minúsculas>;request-id:<x-request-id>;ts:<timestamp>;`
3. **Cálculo**: `HMAC-SHA256(secret, manifest)` debe coincidir con `v1`

> ⚠️ **IMPORTANTE**: El `data.id` llega en MAYÚSCULAS en los query params pero debe usarse en **minúsculas** para la validación HMAC.

### 1.3 Eventos webhook para QR estático

| Evento      | `action`          | Descripción                         |
| ----------- | ----------------- | ----------------------------------- |
| Procesada   | `order.processed` | Pago aprobado y acreditado          |
| Cancelada   | `order.canceled`  | Orden cancelada por el usuario o MP |
| Expirada    | `order.expired`   | Orden expirada (después de 15 min)  |
| Reembolsada | `order.refunded`  | Pago reembolsado                    |

### 1.4 Contrato de respuesta

Mercado Pago espera una respuesta **HTTP 200 o 201 dentro de 22 segundos**. Si no recibe respuesta, reintenta cada 15 minutos hasta 3 intentos.

---

## 2. Implementación del Receptor

### 2.1 Arquitectura actual

El receptor ya está implementado en `backend/controllers/mercadopago.js`:

```
POST /api/mp/webhook  (endpoint público, sin auth JWT)
```

**Flujo:**

```
MP envía POST → Validación HMAC → Respuesta 200 inmediata → Procesamiento async
                                                              ├─ order.processed → Crea venta + descuenta stock
                                                              ├─ order.canceled  → Marca como 'cancelled'
                                                              └─ order.expired   → Marca como 'expired'
```

### 2.2 Validación HMAC implementada

```javascript
// Parse ts y v1 del header x-signature
const parts = xSignature.split(",");
let ts = null,
  hash = null;
for (const part of parts) {
  const [key, value] = part.split("=", 2).map((s) => s.trim());
  if (key === "ts") ts = value;
  if (key === "v1") hash = value;
}

// Construir manifest (data.id en minúsculas)
const dataId = (req.query["data.id"] || "").toString().toLowerCase();
const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

// Verificar HMAC
const expectedHash = crypto
  .createHmac("sha256", webhookSecret)
  .update(manifest)
  .digest("hex");

if (expectedHash !== hash) {
  return res.status(401).json({ message: "Invalid signature" });
}
```

### 2.3 Procesamiento de orden aprobada

Cuando llega `order.processed`:

1. Marca `mp_pending_orders` como `completed` (claim atómico para evitar doble procesamiento)
2. Dentro de una transacción:
   - Crea registro en `sales` con `status = 'completed'`
   - Inserta items en `sale_items`
   - Descuenta stock en `products`
   - Registra movimiento en `stock_movements`

### 2.4 Polling del frontend

El frontend hace polling cada 4 segundos a:

```
GET /api/mp/order-status/:externalReference
```

Responde con el estado actual de la orden desde `mp_pending_orders`.

---

## 3. Configuración del Webhook en Mercado Pago

### 3.1 Paso 1: Crear aplicación en DevPanel

> ⚠️ **BLOQUEANTE**: Actualmente no hay aplicaciones creadas en tu cuenta de MP.

1. Ingresá a [Tus integraciones](https://www.mercadopago.com/developers/panel/app)
2. Hacé clic en **"Crear aplicación"**
3. Configuración sugerida:
   - **Nombre**: `StockFlow POS`
   - **Tipo de integración**: Pagos presenciales / QR Code
   - **Modelo de integración**: QR Estático
4. Una vez creada, anotá el `application_id`

### 3.2 URL del backend (Railway)

Tu backend ya está desplegado en producción con HTTPS:

```
https://stockflow-production-b179.up.railway.app/api/mp/webhook
```

Esta es la URL que debés configurar en el DevPanel de Mercado Pago.

### 3.3 Paso 3: Configurar webhook vía DevPanel

1. En [Tus integraciones](https://www.mercadopago.com/developers/panel/app), seleccioná tu app
2. Menú izquierdo → **Webhooks > Configurar notificaciones**
3. Seleccioná la pestaña **Modo productivo**
4. Ingresá tu URL HTTPS: `https://stockflow-production-b179.up.railway.app/api/mp/webhook`
5. Seleccioná el evento **Order (Mercado Pago)**
6. Hacé clic en **Guardar configuración**
7. **¡IMPORTANTE!** Esto genera una **clave secreta** — copiala y guardala en tu `.env`:

```env
MP_WEBHOOK_SECRET=<clave-secreta-generada>
```

### 3.4 Paso 3 (alternativa): Configurar webhook vía MCP

Si tenés el `application_id` de tu app, podés usar la herramienta MCP de Mercado Pago:

```
Herramienta: mcp_mercadopago_save_webhook
Parámetros:
  - application_id: <tu_application_id>
  - url: https://stockflow-production-b179.up.railway.app/api/mp/webhook
  - events: ["order"]
```

> Nota: Después de guardar, revisá el DevPanel para obtener la clave secreta (`MP_WEBHOOK_SECRET`).

### 3.5 Paso 4: Testing con credenciales de prueba

Para probar webhooks con credenciales de prueba:

1. Iniciá sesión en [Mercado Pago Developers](https://www.mercadopago.com/developers/es/docs) con el **Seller Test User** (disponible en "Información general" de tu app)
2. Configurá los Webhooks **en modo producción** para esa cuenta de prueba
3. Las notificaciones llegarán al mismo endpoint

---

## 4. Simulación y Validación de Pagos

### 4.1 Simular notificación desde el DevPanel

1. En la configuración de Webhooks de tu app, hacé clic en **"Simular"**
2. Seleccioná la URL configurada
3. Seleccioná el **tipo de evento** (ej. `order.processed`)
4. Ingresá un **Data ID** de prueba (ej. un `external_reference` de una orden pendiente)
5. Hacé clic en **"Enviar prueba"**

### 4.2 Simular manualmente con cURL

Para probar tu endpoint sin firma HMAC (cuando `MP_WEBHOOK_SECRET` está vacío):

```bash
# Simular order.processed
curl -X POST "https://stockflow-production-b179.up.railway.app/api/mp/webhook?data.id=ORD_TEST_123&type=order" \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-$(uuidgen)" \
  -d '{
    "action": "order.processed",
    "api_version": "v1",
    "application_id": "0000000000",
    "date_created": "2025-01-01T00:00:00Z",
    "id": "test-notification-1",
    "live_mode": false,
    "type": "order",
    "user_id": 3296968111,
    "data": {
      "id": "ORD_TEST_123",
      "external_reference": "SF-XXXXXX-XXXXXXXX",
      "status": "processed",
      "status_detail": "accredited",
      "total_amount": "100.00",
      "total_paid_amount": "100.00",
      "transactions": {
        "payments": [{
          "amount": "100.00",
          "id": "PAY_TEST_001",
          "paid_amount": "100.00",
          "payment_method": { "id": "account_money", "installments": 1, "type": "account_money" },
          "reference": { "id": "92937960454" },
          "status": "processed",
          "status_detail": "accredited"
        }]
      },
      "type": "qr",
      "version": 2
    }
  }'
```

```bash
# Simular order.canceled
curl -X POST "https://stockflow-production-b179.up.railway.app/api/mp/webhook?data.id=ORD_TEST_456&type=order" \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-cancel-1" \
  -d '{
    "action": "order.canceled",
    "api_version": "v1",
    "application_id": "0000000000",
    "date_created": "2025-01-01T00:00:00Z",
    "id": "test-notification-2",
    "live_mode": false,
    "type": "order",
    "user_id": 3296968111,
    "data": {
      "id": "ORD_TEST_456",
      "external_reference": "SF-XXXXXX-XXXXXXXX",
      "status": "canceled",
      "status_detail": "canceled",
      "total_amount": "100.00",
      "type": "qr",
      "version": 2
    }
  }'
```

```bash
# Simular order.expired
curl -X POST "https://stockflow-production-b179.up.railway.app/api/mp/webhook?data.id=ORD_TEST_789&type=order" \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-expire-1" \
  -d '{
    "action": "order.expired",
    "api_version": "v1",
    "application_id": "0000000000",
    "date_created": "2025-01-01T00:00:00Z",
    "id": "test-notification-3",
    "live_mode": false,
    "type": "order",
    "user_id": 3296968111,
    "data": {
      "id": "ORD_TEST_789",
      "external_reference": "SF-XXXXXX-XXXXXXXX",
      "status": "expired",
      "status_detail": "expired",
      "total_amount": "100.00",
      "type": "qr",
      "version": 2
    }
  }'
```

> **Nota**: Reemplazá `SF-XXXXXX-XXXXXXXX` con un `external_reference` real de una orden pendiente en tu base de datos.

### 4.3 Simular con validación HMAC completa

Para probar la validación HMAC como lo hace Mercado Pago en producción:

```bash
# Script para generar firma HMAC y enviar webhook simulado
# Guardar como test-webhook-hmac.sh

#!/bin/bash
SECRET="<tu_MP_WEBHOOK_SECRET>"
DATA_ID="ord_test_123"  # en minúsculas para el HMAC
REQUEST_ID="test-$(date +%s)"
TS=$(date +%s%3N)  # timestamp en milisegundos

# Construir manifest (exactamente como lo espera MP)
MANIFEST="id:${DATA_ID};request-id:${REQUEST_ID};ts:${TS};"

# Calcular HMAC-SHA256
SIGNATURE=$(echo -n "$MANIFEST" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Enviar webhook con firma
curl -X POST "https://stockflow-production-b179.up.railway.app/api/mp/webhook?data.id=ORD_TEST_123&type=order" \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=${TS},v1=${SIGNATURE}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -d '{
    "action": "order.processed",
    "api_version": "v1",
    "application_id": "0000000000",
    "date_created": "2025-01-01T00:00:00Z",
    "id": "test-hmac-1",
    "live_mode": false,
    "type": "order",
    "user_id": 3296968111,
    "data": {
      "id": "ORD_TEST_123",
      "external_reference": "SF-XXXXXX-XXXXXXXX",
      "status": "processed",
      "status_detail": "accredited",
      "total_amount": "500.00",
      "total_paid_amount": "500.00",
      "transactions": {
        "payments": [{
          "amount": "500.00",
          "id": "PAY_HMAC_001",
          "paid_amount": "500.00",
          "payment_method": { "id": "debit_card", "installments": 1, "type": "debit_card" },
          "reference": { "id": "9999999" },
          "status": "processed",
          "status_detail": "accredited"
        }]
      },
      "type": "qr",
      "version": 2
    }
  }'

echo ""
echo "Manifest: $MANIFEST"
echo "Signature: ts=${TS},v1=${SIGNATURE}"
```

### 4.4 Consultar historial de notificaciones con MCP

Una vez configurado el webhook, podés consultar las notificaciones enviadas:

```
Herramienta: mcp_mercadopago_notifications_history
```

Esto mostrará las notificaciones enviadas a tu endpoint, incluyendo si fueron recibidas correctamente (200/201) o fallaron.

### 4.5 Crear usuarios de prueba con MCP

Para hacer pruebas de pago end-to-end:

```
Herramienta: mcp_mercadopago_create_test_user
```

Esto crea un usuario de prueba con saldo ficticio que puede escanear tu QR estático y simular un pago real.

### 4.6 Flujo de prueba end-to-end

```
1. Configurar webhook en DevPanel con la URL de Railway:
   https://stockflow-production-b179.up.railway.app/api/mp/webhook

2. Copiar la clave secreta → MP_WEBHOOK_SECRET en variables de entorno de Railway

3. Reiniciar/redesplegar backend

5. Abrir el frontend → POS → Agregar productos → Pagar con "Mercado Pago QR"

6. Se crea la orden en MP → Se muestra el spinner de espera en el frontend

7. OPCIÓN A: Simular pago con cURL (sección 4.2)
   OPCIÓN B: Escanear QR con la app de MP del test user
   OPCIÓN C: Simular desde el DevPanel (sección 4.1)

8. El webhook llega → Se procesa → Se crea la venta → El frontend detecta "completed"

9. Verificar:
   - Tabla mp_pending_orders: status = 'completed'
   - Tabla sales: nueva venta creada
   - Tabla sale_items: items de la venta
   - Tabla products: stock descontado
   - Tabla stock_movements: movimiento de salida registrado
```

### 4.7 Verificación SQL

```sql
-- Ver órdenes pendientes/completadas de MP
SELECT external_reference, mp_order_id, status, total_amount, created_at
FROM mp_pending_orders
ORDER BY created_at DESC
LIMIT 10;

-- Ver ventas recientes
SELECT s.id, s.total_amount, s.status, s.created_at,
       json_agg(json_build_object('product', si.product_id, 'qty', si.quantity, 'price', si.unit_price))
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
GROUP BY s.id
ORDER BY s.created_at DESC
LIMIT 5;

-- Verificar movimientos de stock por MP
SELECT sm.*, p.name
FROM stock_movements sm
JOIN products p ON p.id = sm.product_id
WHERE sm.reason LIKE '%MP%'
ORDER BY sm.created_at DESC;
```

---

## Troubleshooting

| Problema                           | Causa                                          | Solución                                                                        |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Webhook nunca llega                | URL no accesible desde internet                | Verificar que Railway está corriendo y la URL es correcta                       |
| HTTP 401 en webhook                | HMAC mismatch                                  | Verificar `MP_WEBHOOK_SECRET` es correcto y que `data.id` se pasa en minúsculas |
| HTTP 500 en webhook                | Error en procesamiento                         | Revisar logs del backend (`console.error`)                                      |
| Frontend queda en "Esperando pago" | Webhook no procesó o polling falla             | Verificar tabla `mp_pending_orders` y logs                                      |
| "Configuración de MP incompleta"   | Falta variable de entorno                      | Verificar `.env` tiene `MP_ACCESS_TOKEN`, `MP_USER_ID`, `MP_EXTERNAL_POS_ID`    |
| Doble procesamiento                | Webhook duplicado                              | El claim atómico (`UPDATE ... WHERE status='pending'`) ya previene esto         |
| Caja no abierta al procesar        | Caja se cerró entre crear orden y recibir pago | La venta se crea igualmente (MP ya cobró al cliente)                            |

---

## Checklist final

- [ ] Crear aplicación en [DevPanel de Mercado Pago](https://www.mercadopago.com/developers/panel/app)
- [x] Backend desplegado con HTTPS en Railway
- [ ] Configurar webhook URL + evento "order" en DevPanel
- [ ] Copiar clave secreta → `MP_WEBHOOK_SECRET` en `.env`
- [ ] Reiniciar backend
- [ ] Probar simulación desde DevPanel (botón "Simular")
- [ ] Probar flujo completo: crear orden → simular pago → verificar venta creada
- [ ] Probar con test user escaneando QR real
