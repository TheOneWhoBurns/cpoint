# Rental Management System - Implementation Plan

## Overview

A web app for managing equipment rentals, optimized for tablet use in landscape orientation.

## Item Tracking Model

All product types and inventory items are configured via admin UI - nothing hardcoded.

### Two Tracking Types

**Tracked Items:**
- Have unique identifiers (e.g., SURF-001)
- Individual status (available/rented/blocked)
- Can be blocked for maintenance
- Full rental history per item

**Generic Items:**
- Quantity-based inventory (e.g., 15 available)
- No individual tracking
- Decrement/increment stock count
- Often bundled with tracked items

### Mixed Rentals

A single rental can include multiple items of both types:
```
Rental #1234
├── [tracked] MASK-003 - Snorkel mask
├── [generic] Fins x1
└── Customer: John, Phone: 555-1234
```

## Pricing Model

- **Configurable per product type** (not hardcoded)
- Some items: daily rate only
- Some items: hourly + daily rates
- Rates stored in database, editable via admin

## Operator Shifts

Simple shift-based tracking (no real auth):
- Operator selects their profile on login (from list)
- Enters simple passcode to confirm
- All actions during shift attributed to that operator
- "End shift" logs them out and records shift end time
- Shift summary: rentals handled, revenue collected

```
┌─────────────────────────────────┐
│  Start Shift                    │
│                                 │
│  Select Operator:               │
│  ┌─────────────────────────┐   │
│  │ ● Maria                 │   │
│  │ ○ Carlos                │   │
│  │ ○ Ana                   │   │
│  └─────────────────────────┘   │
│                                 │
│  Passcode: [____]              │
│                                 │
│  [Start Shift]                  │
└─────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Runtime** | Node.js 20 LTS | Stable, well-supported |
| **Framework** | SvelteKit | Full-stack, simple reactivity, small bundles |
| **Database** | PostgreSQL + JSONB | Hybrid flexibility, Odoo-compatible |
| **ORM** | Drizzle ORM | Type-safe, SQL-like, lightweight |
| **Styling** | Material Web (@material/web) | Material 3, Google's official web components |
| **Real-time** | Server-Sent Events (SSE) | Simple one-way updates for dashboard |
| **Deployment** | Docker Compose + Nginx | PostgreSQL + app containers, reverse proxy |

---

## Database Design: PostgreSQL + JSONB Hybrid

### Why PostgreSQL?

1. **Odoo Integration** - Odoo runs on PostgreSQL natively, making future integration cleaner
2. **JSONB Excellence** - Best-in-class JSON handling with indexing support
3. **Hybrid Approach** - Structured where it matters, flexible where needed
4. **Industry Standard** - Skills transfer, great docs, battle-tested

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│  STRUCTURED COLUMNS          │  JSONB COLUMNS              │
│  (migrations when changed)   │  (no migrations needed)     │
├──────────────────────────────┼─────────────────────────────┤
│  • IDs (primary/foreign)     │  • customer info            │
│  • timestamps                │  • rental line items        │
│  • status fields             │  • pricing details          │
│  • operator/shift refs       │  • product attributes       │
│  • core business fields      │  • custom metadata          │
└──────────────────────────────┴─────────────────────────────┘
```

### Schema

```sql
-- Operators (simple profiles, not real auth)
CREATE TABLE operators (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    passcode TEXT NOT NULL,  -- Simple 4-digit code
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts (operator work sessions)
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    operator_id INTEGER REFERENCES operators(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    summary JSONB,  -- {rentals_count, revenue, notes}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Types (configurable categories)
CREATE TABLE product_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,              -- "Surfboard", "Snorkel Mask"
    code_prefix TEXT NOT NULL,       -- "SURF", "MASK"
    tracking_type TEXT NOT NULL,     -- "tracked" or "generic"
    pricing JSONB NOT NULL,          -- {hourly_rate, daily_rate, deposit}
    attributes JSONB,                -- {sizes: ["S","M","L"], colors: [...]}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracked Items (individual equipment with unique IDs)
CREATE TABLE tracked_items (
    id SERIAL PRIMARY KEY,
    product_type_id INTEGER REFERENCES product_types(id),
    code TEXT UNIQUE NOT NULL,       -- "SURF-001", "MASK-003"
    status TEXT DEFAULT 'available', -- "available", "rented", "blocked"
    attributes JSONB,                -- {color: "blue", size: "7ft"}
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generic Items (quantity-based inventory)
CREATE TABLE generic_items (
    id SERIAL PRIMARY KEY,
    product_type_id INTEGER REFERENCES product_types(id),
    name TEXT NOT NULL,              -- "Fins (pair)", "Bike Lock"
    total_quantity INTEGER NOT NULL,
    available_quantity INTEGER NOT NULL,
    attributes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rentals (the core transaction)
CREATE TABLE rentals (
    id SERIAL PRIMARY KEY,
    shift_id INTEGER REFERENCES shifts(id),
    status TEXT NOT NULL DEFAULT 'active',  -- "active", "completed", "cancelled"
    customer JSONB,                  -- {name, phone, email, notes, ...future fields}
    items JSONB NOT NULL,            -- [{type, item_id, code, name, rate}, ...]
    pricing JSONB NOT NULL,          -- {type: "hourly"|"daily", rates, deposit, total}
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_return_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    return_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Blocks (maintenance, reservations)
CREATE TABLE equipment_blocks (
    id SERIAL PRIMARY KEY,
    tracked_item_id INTEGER REFERENCES tracked_items(id),
    reason TEXT NOT NULL,            -- "maintenance", "reserved", "damaged"
    blocked_from TIMESTAMPTZ NOT NULL,
    blocked_until TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES operators(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action Log (audit trail for future metrics)
CREATE TABLE action_log (
    id SERIAL PRIMARY KEY,
    shift_id INTEGER REFERENCES shifts(id),
    action_type TEXT NOT NULL,       -- "rental_start", "rental_end", "block", etc.
    entity_type TEXT NOT NULL,       -- "rental", "tracked_item", "generic_item"
    entity_id INTEGER NOT NULL,
    details JSONB,                   -- Action-specific data
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_tracked_items_status ON tracked_items(status);
CREATE INDEX idx_tracked_items_product ON tracked_items(product_type_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_shift ON rentals(shift_id);
CREATE INDEX idx_rentals_dates ON rentals(started_at, returned_at);
CREATE INDEX idx_action_log_created ON action_log(created_at);
CREATE INDEX idx_action_log_type ON action_log(action_type);

-- JSONB indexes for common queries
CREATE INDEX idx_rentals_customer_phone ON rentals ((customer->>'phone'));
```

### Example Data

```sql
-- Product type with flexible pricing
INSERT INTO product_types (name, code_prefix, tracking_type, pricing) VALUES
('Surfboard', 'SURF', 'tracked', '{"hourly_rate": 15, "daily_rate": 50, "deposit": 100}'),
('Snorkel Mask', 'MASK', 'tracked', '{"hourly_rate": 8, "daily_rate": 25, "deposit": 20}'),
('Fins', 'FIN', 'generic', '{"hourly_rate": 5, "daily_rate": 15, "deposit": 0}');

-- Tracked item with custom attributes
INSERT INTO tracked_items (product_type_id, code, attributes) VALUES
(1, 'SURF-001', '{"size": "7ft", "color": "blue", "brand": "Channel Islands"}');

-- Rental with mixed items (JSONB flexibility)
INSERT INTO rentals (shift_id, customer, items, pricing) VALUES
(1,
 '{"name": "John Doe", "phone": "555-1234"}',
 '[
   {"type": "tracked", "item_id": 5, "code": "MASK-003", "name": "Snorkel Mask", "rate": 8},
   {"type": "generic", "item_id": 2, "name": "Fins", "quantity": 1, "rate": 5}
 ]',
 '{"type": "hourly", "subtotal": 13, "deposit": 20, "total": 33}'
);
```

### Future Odoo Integration Points

When integrating with Odoo, these map naturally:
- `operators` → Odoo `hr.employee` or `res.users`
- `rentals` → Odoo `sale.order` with rental products
- `product_types` → Odoo `product.template`
- `action_log` → Odoo accounting entries

Both systems on PostgreSQL means you can:
- Use foreign data wrappers for cross-DB queries
- Run both in same PostgreSQL instance if desired
- Use similar tooling for backups and monitoring

---

## Project Structure

```
rental-manager/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── index.ts           # Database connection
│   │   │   │   ├── schema.ts          # Schema definitions
│   │   │   │   └── migrations/
│   │   │   ├── services/
│   │   │   │   ├── products.ts        # Product types CRUD
│   │   │   │   ├── inventory.ts       # Tracked + generic items
│   │   │   │   ├── rentals.ts         # Rental operations
│   │   │   │   ├── shifts.ts          # Operator shifts
│   │   │   │   ├── metrics.ts         # Dashboard calculations
│   │   │   │   └── action-log.ts      # Audit logging
│   │   │   └── sse.ts                 # SSE manager
│   │   ├── components/
│   │   │   ├── Dashboard.svelte       # Top metrics bar
│   │   │   ├── InventoryGrid.svelte   # Main item grid
│   │   │   ├── TrackedItemCard.svelte # Individual tracked item
│   │   │   ├── GenericItemCard.svelte # Generic item with quantity
│   │   │   ├── RentalModal.svelte     # Build a rental (multi-item)
│   │   │   ├── ShiftLogin.svelte      # Operator shift start
│   │   │   └── ShiftBar.svelte        # Current operator display
│   │   ├── stores/
│   │   │   ├── inventory.ts
│   │   │   ├── shift.ts               # Current operator session
│   │   │   ├── metrics.ts
│   │   │   └── sse.ts
│   │   └── types.ts
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte               # Main single-screen app
│   │   ├── login/+page.svelte         # Shift login screen
│   │   ├── api/
│   │   │   ├── products/              # Product type management
│   │   │   ├── inventory/             # Tracked + generic items
│   │   │   ├── rentals/
│   │   │   ├── shifts/
│   │   │   ├── metrics/
│   │   │   └── events/                # SSE endpoint
│   │   └── admin/
│   │       ├── products/              # Manage product types
│   │       ├── inventory/             # Manage items
│   │       └── operators/             # Manage operator profiles
├── static/
│   └── manifest.json                  # PWA for tablet
├── package.json
├── svelte.config.js
└── Dockerfile
```

## Implementation Phases

### Phase 1: Foundation
- [ ] Initialize SvelteKit project with TypeScript
- [ ] Configure Material Web (@material/web)
- [ ] Set up Docker Compose with PostgreSQL
- [ ] Configure Drizzle ORM with PostgreSQL
- [ ] Create initial schema and run migrations
- [ ] Set up basic app layout shell
- [ ] Implement shift login screen

### Phase 2: Product & Inventory Management
- [ ] Admin UI for creating product types
- [ ] Admin UI for adding tracked items
- [ ] Admin UI for managing generic item stock
- [ ] Configure pricing per product type

### Phase 3: Core UI Components
- [ ] Build TrackedItemCard with status colors
- [ ] Build GenericItemCard with stock display
- [ ] Create InventoryGrid layout
- [ ] Build Dashboard metrics bar
- [ ] Build ShiftBar showing current operator

### Phase 4: Rental Operations
- [ ] Build RentalModal (multi-item selection)
- [ ] Implement rental start logic
- [ ] Implement rental return logic
- [ ] Handle mixed tracked + generic items
- [ ] Update inventory on rental events
- [ ] Implement action logging

### Phase 5: Blocking & Shifts
- [ ] Implement equipment blocking
- [ ] Add blocking UI
- [ ] Implement shift start/end
- [ ] Shift summary on end

### Phase 6: Real-Time & Polish
- [ ] Implement SSE for live updates
- [ ] Dashboard auto-refresh
- [ ] Loading states and error handling
- [ ] Touch optimizations
- [ ] PWA manifest

### Phase 7: Deployment (Hetzner)
- [ ] Production Dockerfile for SvelteKit app
- [ ] docker-compose.yml with PostgreSQL + app services
- [ ] Nginx reverse proxy with SSL (Let's Encrypt)
- [ ] PostgreSQL backup script (pg_dump cron)
- [ ] Environment configuration (.env.production)

## API Endpoints

```
Products (types):
GET    /api/products              - List product types
POST   /api/products              - Create product type
PATCH  /api/products/:id          - Update product type
DELETE /api/products/:id          - Remove product type

Inventory:
GET    /api/inventory             - List all items (tracked + generic)
GET    /api/inventory/tracked     - List tracked items only
GET    /api/inventory/generic     - List generic items only
POST   /api/inventory/tracked     - Add tracked item
POST   /api/inventory/generic     - Add/update generic stock
PATCH  /api/inventory/:id         - Update item
DELETE /api/inventory/:id         - Remove item

Rentals:
GET    /api/rentals               - List active rentals
POST   /api/rentals               - Start new rental (with items array)
GET    /api/rentals/:id           - Get rental details
POST   /api/rentals/:id/return    - Complete rental

Blocks:
GET    /api/blocks                - List active blocks
POST   /api/blocks                - Create block
DELETE /api/blocks/:id            - Remove block

Shifts:
GET    /api/shifts/current        - Get current shift
POST   /api/shifts/start          - Start shift
POST   /api/shifts/end            - End shift
GET    /api/shifts/:id/summary    - Shift summary

Operators:
GET    /api/operators             - List operators
POST   /api/operators             - Create operator

Real-time:
GET    /api/events                - SSE endpoint

Metrics:
GET    /api/metrics               - Dashboard metrics
```

## Customer Data (Extensible)

For now, stored as flexible structure:
```javascript
customer: {
  name: "John Doe",
  phone: "555-1234"
  // Future: email, ID photo, loyalty points, etc.
}
```

This way adding new customer fields doesn't require schema changes.

---

## Deployment Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: rental
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: rental_manager
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  app:
    build: .
    environment:
      DATABASE_URL: postgres://rental:${DB_PASSWORD}@db:5432/rental_manager
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - db
    restart: unless-stopped

volumes:
  postgres_data:
```

### Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup-rental-db.sh
BACKUP_DIR="/var/backups/rental-manager"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
docker exec rental-db pg_dump -U rental rental_manager > "$BACKUP_DIR/rental_$DATE.sql"
gzip "$BACKUP_DIR/rental_$DATE.sql"

# Keep last 7 days
find $BACKUP_DIR -name "rental_*.sql.gz" -mtime +7 -delete
```

---

## Ready to Implement

Plan finalized with:
- **PostgreSQL + JSONB** hybrid approach
- **Tracked vs Generic** item model
- **Mixed rentals** with line items
- **Operator shifts** with simple passcode
- **Odoo-ready** schema design
