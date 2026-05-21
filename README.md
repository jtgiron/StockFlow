# StockFlow

Sistema de punto de venta (POS) y gestión de inventario para comercios minoristas. Incluye control de stock, caja registradora, cuentas corrientes (fiados), reportes, integración con Mercado Pago QR y facturación electrónica ARCA/WSFE.

## Tech Stack

| Capa | Tecnología |
|------|------------|
| Backend | Node.js, Express 5, PostgreSQL, JWT, Zod, Helmet |
| Frontend | React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4 |
| Pagos | Mercado Pago (OAuth + QR estático) |
| Facturación | ARCA/WSFE SOAP (AFIP) |
| Testing | Vitest + Supertest |
| Package manager | pnpm |

## Funcionalidades

- **Autenticación y roles** — Login JWT, roles admin/empleado, rate limiting, refresh token en HttpOnly cookie
- **Productos** — CRUD, búsqueda por código de barras, venta por peso, alta masiva
- **Stock** — Movimientos de entrada/salida/ajuste, alertas de stock bajo, trazabilidad completa
- **Punto de venta** — Venta atómica (cabecera + items + pagos + stock en una transacción)
- **Caja registradora** — Apertura/cierre de turno, arqueo por método de pago, historial
- **Cuentas corrientes (fiados)** — Alta de clientes, cargos automáticos en venta a crédito, pagos, historial
- **Listas de precios** — CRUD, aplicación masiva, log de cambios de precio
- **Reportes** — Resumen de ventas por rango, totales diarios, ticket promedio, top productos, desglose por método de pago
- **Mercado Pago** — Conexión OAuth, QR estático, creación de orden desde POS, confirmación por webhook, creación automática de venta
- **Facturación electrónica ARCA** — Emisión automática post-venta, reintentos automáticos, reintento manual por admin
- **Usuarios** — ABM de usuarios del sistema (solo admin)
- **Categorías** — Gestión de categorías de productos

## Requisitos

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL 14+

## Instalación

### 1. Base de datos

Crear la base y ejecutar los scripts de migración en orden:

```bash
createdb stockflow

psql -d stockflow -f init-scripts/001-schema.sql
psql -d stockflow -f init-scripts/002-add-cash-register-closed-by-user.sql
psql -d stockflow -f init-scripts/003-local-password-reset-codes.sql
psql -d stockflow -f init-scripts/004-mp-pending-orders.sql
psql -d stockflow -f init-scripts/005-cash-register-single-open-per-user.sql
psql -d stockflow -f init-scripts/006-normalize-cash-register-columns.sql
psql -d stockflow -f init-scripts/007-create-mp-merchants.sql
psql -d stockflow -f init-scripts/008-mp-merchants-qr-url.sql
psql -d stockflow -f init-scripts/009-sell-by-weight.sql
psql -d stockflow -f backend/migrations/001_arca_invoicing.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # completar las variables
pnpm install
pnpm dev               # desarrollo (auto-restart con --watch)
```

El servidor inicia en `http://localhost:3000`.

### 3. Frontend

```bash
cd client
pnpm install
pnpm dev               # Vite dev server en http://localhost:5173
```

Para build de producción:

```bash
pnpm build             # genera client/dist/
```

## Variables de Entorno

### Requeridas

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/stockflow
JWT_SECRET=un-secreto-seguro-aleatorio
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Mercado Pago (opcionales, requeridas si se usa MP)

```env
MP_CLIENT_ID=
MP_CLIENT_SECRET=
MP_REDIRECT_URI=
MP_NOTIFICATION_URL=
MP_WEBHOOK_SECRET=
MP_SPONSOR_ID=
MP_ORDER_TIMEOUT_MINUTES=15
```

### ARCA / Facturación electrónica (opcionales, requeridas si se usa ARCA)

```env
ARCA_CUIT=
ARCA_CERT_PEM=
ARCA_PRIVATE_KEY=
ARCA_PTO_VENTA=
ARCA_ENV=homologacion
```

> En producción, variables faltantes dentro de un grupo habilitado abortan el startup. En desarrollo solo generan un warning.

## Estructura del Proyecto

```
StockFlow/
├── backend/
│   ├── app.js                 # Factory de Express app
│   ├── index.js               # Entrypoint: carga env, inicia servidor
│   ├── database.js            # Pool de PostgreSQL
│   ├── config/runtime.js      # Validación de env vars al iniciar
│   ├── controllers/           # Lógica de cada endpoint
│   ├── routes/                # Definición de rutas Express
│   ├── middlewares/           # Auth, CORS, validación
│   ├── schemas/               # Schemas de validación Zod
│   ├── services/arca/         # Facturación electrónica ARCA/WSFE
│   ├── utils/                 # Helpers (auth, db, errores)
│   ├── migrations/            # Migraciones SQL adicionales
│   └── tests/                 # Tests de integración
├── client/src/
│   ├── contexts/              # AuthContext (JWT + HttpOnly cookies)
│   ├── services/api.ts        # Cliente HTTP con auto-refresh
│   ├── pages/                 # Vistas de la app
│   ├── components/            # Componentes reutilizables
│   └── router.tsx             # Rutas del frontend
├── init-scripts/              # Scripts SQL de inicialización
└── vercel.json                # Config de deploy del frontend
```

## Testing

```bash
cd backend
pnpm test              # Ejecutar tests (vitest run)
pnpm test:watch        # Modo watch
```

## Arquitectura

- **Transacciones atómicas** — Todas las ventas (POS y webhook MP) usan `withTransaction()` para crear venta + items + stock + fiado en una sola transacción
- **Facturación en background** — La emisión ARCA es fire-and-forget post-respuesta HTTP; el estado se persiste en `sales` y se reintenta automáticamente via sweep
- **Seguridad** — Helmet, rate limiting por endpoint, HMAC timing-safe en webhooks, refresh token en HttpOnly cookie, validación Zod en mutations

## Licencia

ISC
