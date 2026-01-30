# Nerva WMS Platform - User Guide

## Overview

Nerva is a comprehensive Warehouse Management System (WMS) designed for multi-tenant operations. It provides end-to-end management of inventory, sales orders, fulfilment, dispatch, and returns.

**Live URLs:**
- Frontend: https://nerva-platform-web.vercel.app
- API: https://nerva-platform.onrender.com
- API Documentation: https://nerva-platform.onrender.com/api/docs

---

## Getting Started

### Login

1. Navigate to the login page
2. Enter your credentials:
   - **Tenant ID**: Your organization's unique identifier
   - **Email**: Your user email
   - **Password**: Your password
3. Click "Sign In"

### Demo Credentials

```
Tenant ID: 89fb45a9-590a-4668-a58a-3b808e1c326b
Email:     admin@demo.com
Password:  password123
```

---

## Dashboard

The dashboard provides an at-a-glance view of your warehouse operations:

### KPI Cards

| Metric | Description |
|--------|-------------|
| **Pending Orders** | Sales orders awaiting processing |
| **Ready to Ship** | Shipments packed and ready for dispatch |
| **Open Returns** | RMAs awaiting processing |
| **Stock Alerts** | Items with low stock levels |

### Quick Actions

- **Create Sales Order** - Start a new customer order
- **Receive Stock** - Create a new GRN (Goods Received Note)
- **Plan Dispatch** - Create delivery trips
- **Process Return** - Create a new RMA

### Recent Activity

Shows the latest operations across all modules including order confirmations, shipment dispatches, stock receipts, and adjustments.

---

## Operations Modules

### 1. Inventory

Manage stock levels across your warehouses.

#### Stock on Hand
- View current inventory levels by item and bin location
- Filter by warehouse, item, or bin
- See available vs reserved quantities

#### Stock Transfers
- Move stock between bins within a warehouse
- Transfer stock between warehouses (IBT - Internal Branch Transfer)

#### Adjustments
- Create stock adjustments for discrepancies
- Requires approval workflow for audit compliance
- Supports cycle count adjustments

#### GRN (Goods Received Notes)
- Receive goods from suppliers
- Link to purchase orders
- Scan items during receiving
- Assign putaway locations

### 2. Sales Orders

Manage customer orders from creation to fulfilment.

#### Order Lifecycle

```
DRAFT → CONFIRMED → ALLOCATED → PICKING → PACKING → READY_TO_SHIP → SHIPPED → DELIVERED
```

#### Features
- Create orders with multiple line items
- Set priority levels (1-10)
- Specify requested ship dates
- Link to customers with shipping addresses
- Auto-allocate stock based on availability

#### Allocation
- Reserve stock for orders
- FIFO allocation from available bins
- Handle partial allocations
- Release allocations if order cancelled

### 3. Fulfilment

Pick, pack, and ship orders.

#### Pick Waves
- Group multiple orders into pick waves
- Optimize picker routes
- Assign pickers to waves
- Track pick progress in real-time

#### Pick Tasks
- Individual pick instructions
- Bin-to-bin picking
- Confirm picked quantities
- Handle short picks

#### Packing
- Pack picked items into packages
- Record package dimensions and weight
- Generate packing slips
- Apply shipping labels

#### Shipments
- Create shipments from orders
- Track shipment status
- Record carrier and tracking numbers
- Mark as dispatched

### 4. Dispatch

Plan and execute deliveries.

#### Trip Planning
- Create delivery trips
- Assign vehicles and drivers
- Group shipments by route
- Optimize stop sequences

#### Trip Execution
- Driver starts trip
- Navigate to stops
- Capture proof of delivery (POD)
- Handle exceptions and returns

#### Proof of Delivery
- Capture recipient name
- Digital signature
- Photo evidence
- GPS location stamp
- Record delivery exceptions

### 5. Returns

Handle customer returns and credit notes.

#### RMA (Return Merchandise Authorization)
- Create return requests
- Link to original orders/shipments
- Specify return reasons
- Track expected vs received quantities

#### Receiving Returns
- Inspect returned items
- Record condition
- Determine disposition:
  - **Restock** - Return to sellable inventory
  - **Quarantine** - Hold for further inspection
  - **Scrap** - Write off damaged goods
  - **Return to Supplier** - Send back to vendor

#### Credit Notes
- Generate credit notes from RMAs
- Approval workflow
- Post to finance system

---

## Master Data

### Items

Product master data including:
- **SKU** - Unique product code
- **Description** - Product name/description
- **UOM** - Unit of measure (EA, BOX, PALLET, etc.)
- **Dimensions** - Length, width, height (cm)
- **Weight** - Weight in kg
- **Barcodes** - Multiple barcodes per item

### Customers

Customer master data:
- Contact information (name, email, phone)
- VAT number
- Billing address
- Shipping address(es)
- Active/inactive status

### Suppliers

Supplier master data:
- Contact information
- VAT number
- Address
- Lead times
- Active/inactive status

### Warehouses

Warehouse configuration:
- Warehouse name and code
- Associated site
- Active/inactive status

#### Bins

Storage locations within warehouses:
- **Bin Code** - Unique location identifier
- **Bin Type**:
  - STORAGE - General storage
  - PICKING - Pick face locations
  - RECEIVING - Inbound staging
  - QUARANTINE - Hold for inspection
  - SHIPPING - Outbound staging
  - SCRAP - Damaged goods
- **Aisle/Rack/Level** - Physical coordinates

---

## Administration

### Users

Manage system users:
- Create/edit user accounts
- Assign roles
- Set active/inactive status
- View last login

### Roles & Permissions

Role-based access control (RBAC):

#### Permission Categories

| Category | Permissions |
|----------|-------------|
| **System** | system.admin, tenant.manage, site.manage, user.manage |
| **Master Data** | item.read, item.write, customer.read, customer.write, supplier.read, supplier.write |
| **Warehouse** | warehouse.manage, grn.create, grn.receive, putaway.execute |
| **Inventory** | inventory.read, inventory.adjust, inventory.adjust.approve, ibt.create, ibt.approve, cycle_count.manage |
| **Sales** | sales_order.read, sales_order.create, sales_order.edit, sales_order.cancel, sales_order.allocate |
| **Fulfilment** | pick_wave.create, pick_task.execute, pack.execute, shipment.create, shipment.ready |
| **Dispatch** | dispatch.plan, dispatch.assign, dispatch.execute, pod.capture |
| **Returns** | rma.create, rma.receive, rma.disposition, credit.create, credit.approve |
| **Finance** | integration.manage, posting.view, posting.retry |
| **Reporting** | report.operational, report.financial, audit.read |

### Integrations

Connect to external finance systems:
- **Xero** - Cloud accounting
- **Sage** - ERP integration
- **QuickBooks** - Accounting software
- **Custom API** - Generic integration

#### Posting Queue
- View pending posts to finance
- Retry failed posts
- Track successful integrations

### Settings

Configure tenant-level settings:
- Site management
- System preferences
- Notification settings

---

## Workflows

### Order-to-Cash Workflow

```
1. Create Sales Order
   ↓
2. Confirm Order
   ↓
3. Allocate Stock
   ↓
4. Create Pick Wave
   ↓
5. Execute Pick Tasks
   ↓
6. Pack Shipment
   ↓
7. Create Dispatch Trip
   ↓
8. Deliver & Capture POD
   ↓
9. Invoice Customer (via Integration)
```

### Procure-to-Pay Workflow

```
1. Create Purchase Order
   ↓
2. Receive Goods (GRN)
   ↓
3. Quality Inspection
   ↓
4. Putaway to Bins
   ↓
5. Stock Available
   ↓
6. Pay Supplier (via Integration)
```

### Returns Workflow

```
1. Customer Requests Return
   ↓
2. Create RMA
   ↓
3. Receive Returned Goods
   ↓
4. Inspect Items
   ↓
5. Determine Disposition
   ↓
6. Create Credit Note
   ↓
7. Approve Credit
   ↓
8. Post to Finance
```

---

## Stock Ledger

The stock ledger is the source of truth for all inventory movements.

### Movement Types

| Reason | Description |
|--------|-------------|
| RECEIVE | Goods received from supplier |
| PUTAWAY | Move from receiving to storage |
| PICK | Remove from bin for order |
| PACK | Move to shipment package |
| SHIP | Dispatched to customer |
| RETURN | Received from customer return |
| ADJUST | Inventory adjustment |
| IBT_OUT | Transferred out to another warehouse |
| IBT_IN | Transferred in from another warehouse |
| SCRAP | Written off as damaged/expired |

### Stock Snapshot

Cached view of current stock levels:
- **qty_on_hand** - Physical quantity in bin
- **qty_reserved** - Allocated to orders
- **qty_available** - On hand minus reserved

---

## Multi-Tenant Architecture

Nerva supports multiple tenants (organizations) on a single platform:

- Each tenant has isolated data
- Tenant ID required for all operations
- Users belong to a single tenant
- Sites and warehouses are tenant-specific

### Sites

Sites represent physical locations or business units:
- A tenant can have multiple sites
- Each site can have multiple warehouses
- Users can be restricted to specific sites

---

## API Documentation

Full API documentation is available at:
https://nerva-platform.onrender.com/api/docs

### Authentication

All API requests require a JWT token:

```bash
# Login to get token
curl -X POST https://nerva-platform.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "email": "your@email.com",
    "password": "your-password"
  }'

# Use token in requests
curl https://nerva-platform.onrender.com/api/v1/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: your-tenant-id"
```

### API Endpoints

| Module | Base Path |
|--------|-----------|
| Auth | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Items | `/api/v1/items` |
| Customers | `/api/v1/customers` |
| Suppliers | `/api/v1/suppliers` |
| Warehouses | `/api/v1/warehouses` |
| Inventory | `/api/v1/inventory` |
| GRNs | `/api/v1/receiving/grns` |
| Adjustments | `/api/v1/inventory/adjustments` |
| Sales Orders | `/api/v1/sales/orders` |
| Fulfilment | `/api/v1/fulfilment` |
| Shipments | `/api/v1/shipments` |
| Dispatch | `/api/v1/dispatch` |
| Driver | `/api/v1/driver` |
| Returns | `/api/v1/returns/rmas` |
| Credits | `/api/v1/finance/credits` |
| Integrations | `/api/v1/integrations` |

---

## Technical Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TailwindCSS** - Styling
- **TanStack React Query** - Data fetching
- **Zustand** - State management
- **Axios** - HTTP client

### Backend
- **NestJS** - Node.js framework
- **PostgreSQL 18** - Database
- **JWT** - Authentication
- **Swagger** - API documentation

### Infrastructure
- **Vercel** - Frontend hosting
- **Render** - API and database hosting
- **GitHub** - Source control

---

## Support

For issues or feature requests, please contact your system administrator or refer to the API documentation for technical details.
