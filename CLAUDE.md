# Equipment Rental Management System

A full-stack SvelteKit application for managing equipment rentals and point-of-sale operations with real-time inventory tracking, guide management, and shift-based operations.

**Stack**: SvelteKit, TypeScript, PostgreSQL, Drizzle ORM, Material Web 3
**Deployment**: EC2 with systemd service, GitHub Actions deploys on push to `rental-system` (blue-green Docker/Nginx infra exists in repo but is not yet active)
**Key Features**: Equipment rentals (tracked + generic items), guide management with cooldown, store sales, shift-based operations, Excel reporting

## Quick Links

For detailed architecture and module breakdown, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Core Architecture

- **Frontend**: Svelte 5 components with Material Design 3 UI (tablet-optimized)
- **Backend**: SvelteKit API routes with PostgreSQL + Drizzle ORM
- **Database**: 13 core tables with JSONB hybrid approach for flexibility
- **Deployment**: EC2 systemd service, auto-deployed via GitHub Actions on push to `rental-system`

## Main Pages

- **Rental Manager** (`/`) - Create rentals, track active/previous, close rentals, manage store sales
- **Login** (`/login`) - Operator authentication with 4-digit passcode
- **Admin Dashboard** (`/admin/*`) - Equipment, guides, operators, products, inventory management

## API Endpoints (14 total)

- Equipment management (CRUD)
- Guide management (CRUD + PIN verification)
- Operator management (CRUD)
- Rental products (bundles with equipment + pricing)
- Rentals (create, close with pricing calculation)
- Shifts (start, end, close with Excel export)
- Store products & sales (POS)
- Health check

## Key Business Logic

- **Pricing**: Hourly (minimum 1 hr, round up) or full-day flat rate
- **Inventory**: Mixed tracked items (unique codes) + generic quantities in single rental
- **Guide Cooldown**: Configurable cooldown after rental return, overridable via PIN
- **Shifts**: Operator-based sessions tracking all rentals and sales
- **Reporting**: Excel export with rental and sales data

## Getting Started

1. Check out rental-system branch (default is set to this)
2. Read [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md) for architecture overview
3. Review [RENTAL_SYSTEM_PLAN.md](RENTAL_SYSTEM_PLAN.md) for product specification
4. Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment instructions

## Development

```bash
npm install
npm run dev        # Start dev server
npm run db:push    # Apply schema migrations
npm run db:studio  # Open database GUI
```

## Production

Deployed to EC2 via GitHub Actions on push to `rental-system`:
- Single Node.js process managed by systemd (`rental-app` service)
- App runs on port 3000, health check at `/health`
- Deploy workflow: `git pull` → `npm ci` → `npm run build` → `npm run db:push` → `systemctl restart`
- Blue-green Docker/Nginx infrastructure exists in repo for future use but is not yet active
