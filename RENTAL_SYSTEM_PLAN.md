# Rental Management System - Implementation Plan

## Overview

A web app for managing equipment rentals, optimized for tablet use in landscape orientation.

## Equipment Categories

| Category | Type | Tracking | Example |
|----------|------|----------|---------|
| Bikes | Tracked | Unique ID per bike | BIKE-001, BIKE-002 |
| Surfboards | Tracked | Unique ID per board | SURF-001, SURF-002 |
| Bodyboards | Tracked | Unique ID per board | BODY-001, BODY-002 |
| Wetsuits | Tracked | Unique ID per suit | WET-S-01, WET-M-01 |
| Snorkel Masks | Tracked | Unique ID per mask | MASK-001, MASK-002 |
| Fins | Generic | Quantity-based | "Fins (pair)" - 20 in stock |
| Bike Locks | Generic | Quantity-based | "Bike Lock" - 15 in stock |

### Key Distinction: Tracked vs Generic Items

**Tracked Items:**
- Have unique identifiers (SURF-001)
- Individual status (available/rented/blocked)
- Can be blocked for maintenance
- History of who rented each specific item

**Generic Items:**
- Quantity-based inventory (15 fins available)
- No individual tracking
- Just decrement/increment stock count
- Often bundled with tracked items

### Mixed Rentals

A single rental can include multiple items:
```
Rental #1234
├── MASK-003 (tracked) - Snorkel mask
├── Fins x1 (generic) - from stock
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
| **Database** | **TBD - SEE DISCUSSION BELOW** | |
| **Styling** | Tailwind CSS | Utility-first, great for responsive layouts |
| **Real-time** | Server-Sent Events (SSE) | Simple one-way updates for dashboard |
| **Deployment** | PM2 + Nginx | Process management, reverse proxy, SSL |

---

## DATABASE APPROACH - DISCUSSION NEEDED

### The Problem

You raised valid concerns about relational databases:
- Schema changes require migrations
- Adding new product types = alter tables
- New pricing models = schema changes
- Rigid structure fights against "rapid and unexpected changes"

### Option A: SQLite with JSON Columns (Hybrid)

Keep SQLite but use JSON for flexible parts:

```
┌─────────────────────────────────────────────────────────────┐
│  STRUCTURED (relational)     │  FLEXIBLE (JSON blobs)      │
├──────────────────────────────┼─────────────────────────────│
│  - Rental ID, timestamps     │  - Product attributes       │
│  - Operator/shift refs       │  - Pricing rules            │
│  - Foreign keys              │  - Customer fields          │
│  - Core status fields        │  - Custom metadata          │
└──────────────────────────────┴─────────────────────────────┘
```

**Pros:**
- Single file, zero config (SQLite simplicity)
- Can query JSON fields with SQLite JSON functions
- Flexible where needed, structured where it matters
- Easy backups

**Cons:**
- JSON queries are slower than indexed columns
- Less type safety on flexible parts
- Mixed paradigm can be confusing

### Option B: Document Database (MongoDB/LiteDB)

Full document-based approach:

```javascript
// Each rental is a self-contained document
{
  _id: "rental_abc123",
  created_at: "2026-01-04T10:30:00Z",
  operator: { id: "op_1", name: "Maria" },
  customer: { name: "John", phone: "555-1234" },
  items: [
    { type: "tracked", code: "MASK-003", name: "Snorkel Mask", rate: 15 },
    { type: "generic", name: "Fins", quantity: 1, rate: 5 }
  ],
  pricing: { type: "hourly", rate_total: 20 },
  status: "active",
  // ... any other fields you want
}
```

**Pros:**
- Maximum flexibility - add any field anytime
- No migrations ever
- Natural fit for "mixed rental" model
- Self-contained documents

**Cons:**
- MongoDB = external server to manage (complexity)
- Or use embedded doc DB (less mature than SQLite)
- No referential integrity (can have orphaned refs)
- Harder to do cross-document queries

### Option C: PostgreSQL with JSONB

Best of both worlds but heavier:

```sql
CREATE TABLE rentals (
    id SERIAL PRIMARY KEY,
    operator_id INTEGER REFERENCES operators(id),
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Flexible parts
    customer JSONB,           -- {"name": "John", "phone": "555", "future_field": "..."}
    items JSONB,              -- Array of rental line items
    pricing JSONB,            -- Flexible pricing structure
    metadata JSONB            -- Anything else
);

-- Can still index and query JSON efficiently
CREATE INDEX idx_customer_phone ON rentals ((customer->>'phone'));
```

**Pros:**
- Robust, battle-tested
- JSONB is fast and indexable
- Referential integrity where you want it
- Flexible where you need it

**Cons:**
- External server (PostgreSQL)
- More setup on Hetzner
- Overkill for single-user app?

### Option D: SQLite + "EAV-lite" Pattern

Entity-Attribute-Value for truly dynamic fields:

```sql
-- Core rental record
CREATE TABLE rentals (id, operator_id, status, created_at);

-- Dynamic properties
CREATE TABLE rental_properties (
    rental_id INTEGER REFERENCES rentals(id),
    key TEXT NOT NULL,
    value TEXT,  -- JSON-encoded
    PRIMARY KEY (rental_id, key)
);
```

**Pros:**
- Pure SQLite, no JSON functions needed
- Add any property without schema change
- Simple to understand

**Cons:**
- Queries become awkward (lots of joins)
- Performance degrades with many properties
- Not idiomatic

---

### My Recommendation: Option A or C

**For simplicity → Option A (SQLite + JSON columns)**
- You keep single-file simplicity
- Use JSON columns for: customer info, item details, pricing, metadata
- Use regular columns for: IDs, timestamps, status, foreign keys
- SQLite 3.38+ has good JSON support

**For robustness → Option C (PostgreSQL + JSONB)**
- If you're on Hetzner anyway, PostgreSQL is easy to set up
- Better JSON handling than SQLite
- Scales better if app grows
- Still just one `docker-compose` service

### Questions for You:

1. **How often do you expect schema changes?** Weekly? Monthly? Yearly?
2. **Do you need complex queries across rentals?** (e.g., "all rentals of SURF-001 in December")
3. **Is "one file database" important?** Or is PostgreSQL acceptable complexity?
4. **Expected data volume?** 10 rentals/day? 100? 1000?

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
├── tailwind.config.js
└── Dockerfile
```

## UI Layout (Tablet Landscape ~1024x768)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  RENTAL MANAGER          👤 Maria (Shift: 2h 15m)        Today: $450 │ ⚙️  │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌─── DASHBOARD METRICS ──────────────────────────────────────────────┐   │
│  │  🏄 Rented: 12   │  ✅ Available: 8   │  📦 Generic: OK  │  💰 $450  │  │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─── TRACKED ITEMS ──────────────────────────────────────────────────┐   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │   │ SURF-01 │  │ SURF-02 │  │ MASK-01 │  │ BIKE-01 │              │   │
│  │   │ 🟢 Avail│  │ 🔴 2h15m│  │ 🟢 Avail│  │ 🟡 Block│              │   │
│  │   │ $15/hr  │  │ John D. │  │ $10/hr  │  │ Repair  │              │   │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘              │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─── GENERIC ITEMS ──────────────────────────────────────────────────┐   │
│  │   [Fins: 18 avail]  [Locks: 12 avail]  [Booties: 8 avail]         │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─── ACTIONS ────────────────────────────────────────────────────────┐   │
│  │   [+ New Rental]              [End Shift]                          │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

### New Rental Flow (Multi-Item)

```
┌─────────────────────────────────────────────────────────────┐
│  NEW RENTAL                                            [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Customer: [John Doe_________]  Phone: [555-1234____]      │
│                                                             │
│  ┌─── ITEMS IN RENTAL ────────────────────────────────┐    │
│  │  MASK-003 (Snorkel Mask)              $10/hr  [x] │    │
│  │  Fins (generic) x1                     $5/hr  [x] │    │
│  │                                                    │    │
│  │  [+ Add Tracked Item]  [+ Add Generic Item]        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Duration: ○ Hourly  ● Daily                               │
│  Estimated Total: $30                                       │
│                                                             │
│              [Cancel]  [Start Rental]                       │
└─────────────────────────────────────────────────────────────┘
```

### Status Color Coding
- 🟢 Green: Available
- 🔴 Red: Currently rented (shows elapsed time or customer)
- 🟡 Yellow: Blocked/Maintenance
- ⚫ Gray: Inactive

## Implementation Phases

### Phase 1: Foundation
- [ ] Initialize SvelteKit project with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Set up database (pending decision)
- [ ] Create initial schema
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

### Phase 7: Deployment
- [ ] Dockerfile
- [ ] docker-compose
- [ ] Nginx + SSL
- [ ] PM2 config
- [ ] Backup strategy

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

## Next Steps

1. **Decide on database approach** (see discussion above)
2. Finalize schema based on decision
3. Begin Phase 1 implementation
