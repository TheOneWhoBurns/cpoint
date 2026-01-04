# Rental Management System - Implementation Plan

## Overview

A web app for managing equipment rentals, optimized for tablet use in landscape orientation.

## Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Runtime** | Node.js 20 LTS | Stable, well-supported |
| **Framework** | SvelteKit | Full-stack, simple reactivity, small bundles |
| **Database** | SQLite + Drizzle ORM | Single-file DB, type-safe, zero config |
| **Styling** | Tailwind CSS | Utility-first, great for responsive layouts |
| **Real-time** | Server-Sent Events (SSE) | Simple one-way updates for dashboard |
| **Deployment** | PM2 + Nginx | Process management, reverse proxy, SSL |

## Database Schema

```sql
-- Core Equipment Table
CREATE TABLE equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,           -- "SURF-001", "KAYAK-005"
    name TEXT NOT NULL,                   -- "Surfboard 7ft Blue"
    category TEXT NOT NULL,               -- "surfboard", "kayak", "wetsuit"
    status TEXT DEFAULT 'available',      -- "available", "rented", "blocked", "maintenance"
    hourly_rate REAL NOT NULL,
    daily_rate REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Active Rentals
CREATE TABLE rentals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    customer_name TEXT,
    customer_phone TEXT,
    rental_type TEXT NOT NULL,            -- "hourly", "daily"
    started_at DATETIME NOT NULL,
    expected_return_at DATETIME,
    returned_at DATETIME,                 -- NULL if still rented
    rate_charged REAL NOT NULL,
    total_amount REAL,
    deposit_amount REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Equipment Blocks
CREATE TABLE equipment_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    reason TEXT NOT NULL,                 -- "maintenance", "reserved", "damaged"
    blocked_from DATETIME NOT NULL,
    blocked_until DATETIME NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sales (non-rental items)
CREATE TABLE sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price REAL NOT NULL,
    total_amount REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Action Log (all operations for metrics/audit)
CREATE TABLE action_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,            -- "rental_start", "rental_end", "sale", "block"
    entity_type TEXT NOT NULL,            -- "equipment", "rental", "sale"
    entity_id INTEGER NOT NULL,
    details TEXT,                         -- JSON blob
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quick Sale Items (predefined)
CREATE TABLE quick_sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0
);
```

## Project Structure

```
rental-manager/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── index.ts           # SQLite + Drizzle connection
│   │   │   │   ├── schema.ts          # Drizzle schema
│   │   │   │   └── migrations/
│   │   │   ├── services/
│   │   │   │   ├── equipment.ts       # Equipment CRUD
│   │   │   │   ├── rentals.ts         # Rental start/end
│   │   │   │   ├── sales.ts           # Sales recording
│   │   │   │   ├── blocks.ts          # Equipment blocking
│   │   │   │   ├── metrics.ts         # Dashboard calculations
│   │   │   │   └── action-log.ts      # Audit logging
│   │   │   └── sse.ts                 # SSE manager
│   │   ├── components/
│   │   │   ├── Dashboard.svelte       # Top metrics bar
│   │   │   ├── EquipmentGrid.svelte   # Main card grid
│   │   │   ├── EquipmentCard.svelte   # Individual card
│   │   │   ├── ActionModal.svelte     # Rent/Return/Block modal
│   │   │   ├── QuickSaleBar.svelte    # Bottom quick sale buttons
│   │   │   └── SaleModal.svelte       # Custom sale entry
│   │   ├── stores/
│   │   │   ├── equipment.ts
│   │   │   ├── metrics.ts
│   │   │   └── sse.ts
│   │   └── types.ts
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte               # Main single-screen app
│   │   ├── api/
│   │   │   ├── equipment/
│   │   │   ├── rentals/
│   │   │   ├── sales/
│   │   │   ├── blocks/
│   │   │   ├── metrics/
│   │   │   └── events/                # SSE endpoint
│   │   └── admin/
│   │       └── equipment/
├── static/
│   └── manifest.json                  # PWA for tablet
├── drizzle.config.ts
├── package.json
├── svelte.config.js
├── tailwind.config.js
└── Dockerfile
```

## UI Layout (Tablet Landscape ~1024x768)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  RENTAL MANAGER                           📊 Today: $450  │ 🔄 Live │ ⚙️   │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌─── DASHBOARD METRICS ──────────────────────────────────────────────┐   │
│  │  🏄 Rented: 12    │  ✅ Available: 8    │  🔧 Blocked: 2   │  💰 $450 │ │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─── EQUIPMENT GRID (scrollable, touch-optimized) ───────────────────┐   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │   │ SURF-01 │  │ SURF-02 │  │ SURF-03 │  │ KAYAK-01│              │   │
│  │   │ 🟢 Avail│  │ 🔴 Rent │  │ 🟡 Block│  │ 🟢 Avail│              │   │
│  │   │ $15/hr  │  │ 2h 15m  │  │ Maint.  │  │ $20/hr  │              │   │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘              │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─── QUICK ACTIONS ──────────────────────────────────────────────────┐   │
│  │   [💧 Water $2]  [🧴 Sunscreen $5]  [🥤 Soda $3]  [+ Custom Sale]  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

### Status Color Coding
- 🟢 Green: Available
- 🔴 Red: Currently rented (shows elapsed time)
- 🟡 Yellow: Blocked/Maintenance
- ⚫ Gray: Inactive

### Touch UX
- Large touch targets (min 48px)
- Single tap = open action modal
- Swipe left on rented item = quick return
- Real-time updates via SSE

## Implementation Phases

### Phase 1: Foundation
- [ ] Initialize SvelteKit project with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Set up Drizzle ORM with SQLite
- [ ] Create database schema (all tables)
- [ ] Run initial migration
- [ ] Create seed script with sample equipment
- [ ] Set up basic app layout shell

### Phase 2: Core UI Components
- [ ] Build base UI components (Button, Modal, Input, Badge)
- [ ] Create EquipmentCard component with status colors
- [ ] Create EquipmentGrid with responsive layout
- [ ] Build Dashboard metrics bar
- [ ] Style for tablet landscape (touch-optimized)
- [ ] Test responsive behavior

### Phase 3: Equipment & Rental Logic
- [ ] Implement equipment service (CRUD)
- [ ] Create equipment API endpoints
- [ ] Build ActionModal with rent/block options
- [ ] Implement rental service (start/return)
- [ ] Create rental API endpoints
- [ ] Wire up UI to API (form actions)
- [ ] Add rental timer display
- [ ] Implement action logging

### Phase 4: Sales & Blocking
- [ ] Implement blocking service
- [ ] Add blocking UI to ActionModal
- [ ] Implement sales service
- [ ] Build QuickSaleBar component
- [ ] Build SaleModal for custom entries
- [ ] Wire up sales API

### Phase 5: Real-Time & Polish
- [ ] Implement SSE server endpoint
- [ ] Create SSE client store
- [ ] Broadcast updates on all actions
- [ ] Update Dashboard with live metrics
- [ ] Add loading states and error handling
- [ ] Optimize touch interactions
- [ ] Add PWA manifest for tablet home screen

### Phase 6: Hetzner Deployment
- [ ] Create Dockerfile
- [ ] Set up docker-compose for local testing
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL with Let's Encrypt
- [ ] Configure PM2 process manager
- [ ] Create backup script for SQLite
- [ ] Set up systemd service

## API Endpoints

```
Equipment:
GET    /api/equipment          - List all equipment
POST   /api/equipment          - Add new equipment
PATCH  /api/equipment/:id      - Update equipment
DELETE /api/equipment/:id      - Remove equipment

Rentals:
GET    /api/rentals            - List active rentals
POST   /api/rentals            - Start new rental
POST   /api/rentals/:id/return - Complete rental

Blocks:
GET    /api/blocks             - List active blocks
POST   /api/blocks             - Create block
DELETE /api/blocks/:id         - Remove block

Sales:
GET    /api/sales              - List today's sales
POST   /api/sales              - Record sale
GET    /api/quick-items        - Get predefined items

Real-time:
GET    /api/events             - SSE endpoint

Metrics:
GET    /api/metrics            - Dashboard metrics
```

## Deployment (Hetzner)

### Nginx Config
```nginx
server {
    listen 443 ssl http2;
    server_name rental.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection '';
        proxy_buffering off;  # Required for SSE
    }
}
```

### PM2 Config
```javascript
module.exports = {
  apps: [{
    name: 'rental-manager',
    script: 'build/index.js',
    instances: 1,  // Single instance for SQLite
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_PATH: '/var/lib/rental-manager/rental.db'
    }
  }]
};
```

### Backup (cron every 6 hours)
```bash
sqlite3 /var/lib/rental-manager/rental.db ".backup '/var/backups/rental_$(date +%Y%m%d_%H%M%S).db'"
```
