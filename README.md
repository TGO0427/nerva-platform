# Nerva Platform

Distribution & Warehouse Management System - Phase 1 MVP

## Tech Stack

- **API**: NestJS + PostgreSQL + Redis
- **Web**: Next.js 14 + React Query + Tailwind CSS
- **Driver App**: (Phase 2) Expo React Native
- **Monorepo**: Turborepo + pnpm

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Setup

```bash
# Clone and install
cd nerva-platform
pnpm install

# Start infrastructure (Postgres, Redis, MinIO)
pnpm db:up

# Copy environment variables
cp .env.example .env

# Start development
pnpm dev
```

### URLs

- **API**: http://localhost:4000
- **Swagger Docs**: http://localhost:4000/api/docs
- **Web App**: http://localhost:3000
- **pgAdmin**: http://localhost:5050 (admin@nerva.local / admin_pw)
- **MinIO Console**: http://localhost:9001 (nerva_minio / nerva_minio_pw)

## Project Structure

```
nerva-platform/
├── apps/
│   ├── api/                 # NestJS API
│   │   └── src/
│   │       ├── common/      # Shared utilities, guards, decorators
│   │       └── modules/     # Feature modules
│   │           ├── auth/
│   │           ├── rbac/
│   │           ├── tenants/
│   │           ├── users/
│   │           ├── masterdata/
│   │           ├── inventory/
│   │           ├── sales/
│   │           ├── fulfilment/
│   │           ├── dispatch/
│   │           ├── returns/
│   │           ├── integrations/
│   │           └── audit/
│   ├── web/                 # Next.js Web App
│   └── driver/              # (Phase 2) Expo Driver App
├── packages/
│   └── shared/              # Shared types & constants
└── infra/
    ├── db/schema.sql        # PostgreSQL schema
    └── docker-compose.yml   # Local infrastructure
```

## Phase 1 MVP Modules

### Master Data
- Items (SKU, barcodes, dimensions)
- Customers & Suppliers
- Warehouses & Bins

### Inventory (Stock Ledger)
- GRN (Goods Received Notes)
- Putaway tasks
- Stock transfers
- Adjustments (with approval)
- Cycle counts

### Sales & Fulfilment
- Sales orders
- Stock allocation
- Pick waves & tasks
- Packing
- Shipments

### Dispatch
- Trip planning
- Driver assignment
- Stop sequencing
- POD capture (signature, photo, GPS)

### Returns
- RMA creation
- Return receiving
- Disposition (restock, quarantine, scrap)
- Credit note drafts

### Integrations
- Finance system connections (Xero, Sage, etc.)
- Posting queue with retry logic

## API Conventions

### Authentication
```bash
# Login
POST /api/v1/auth/login
{
  "tenantId": "uuid",
  "email": "user@example.com",
  "password": "password"
}

# Use Bearer token in subsequent requests
Authorization: Bearer <token>
```

### Multi-tenancy
All requests require tenant context via JWT claims or headers:
```
x-tenant-id: <uuid>
x-site-id: <uuid>  # optional
```

### Pagination
```
GET /api/v1/items?page=1&limit=20&search=widget
```

Response:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Stock Ledger

All stock changes flow through the stock ledger - the single source of truth:

```sql
stock_ledger (
  item_id, from_bin_id, to_bin_id, qty,
  reason, ref_type, ref_id, batch_no, expiry_date
)
```

Reasons: `RECEIVE`, `PUTAWAY`, `PICK`, `PACK`, `SHIP`, `RETURN`, `ADJUST`, `TRANSFER`, `SCRAP`

The `stock_snapshot` table is a cached view updated by the application for fast on-hand queries.

## Scripts

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm test         # Run tests
pnpm db:up        # Start Docker infrastructure
pnpm db:down      # Stop Docker infrastructure
pnpm db:reset     # Reset database (destroy + recreate)
```

## License

Proprietary - All rights reserved
