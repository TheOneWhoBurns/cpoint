# Equipment Rental Management System

A full-stack SvelteKit application for managing equipment rentals and point-of-sale operations with real-time inventory tracking, guide management, and shift-based operations.

**Stack**: SvelteKit, TypeScript, PostgreSQL, Drizzle ORM, Material Web 3
**Deployment**: Docker, Nginx reverse proxy (blue-green infrastructure configured, traffic switching not yet automated)
**Key Features**: Equipment rentals (tracked + generic items), guide management with cooldown, store sales, shift-based operations, Excel reporting

## Quick Links

For detailed architecture and module breakdown, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Core Architecture

- **Frontend**: Svelte 5 components with Material Design 3 UI (tablet-optimized)
- **Backend**: SvelteKit API routes with PostgreSQL + Drizzle ORM
- **Database**: 13 core tables with JSONB hybrid approach for flexibility
- **Deployment**: Blue-green strategy via Nginx reverse proxy, zero-downtime updates

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

Uses docker-compose.prod.yml with blue-green infrastructure:
- Two app instances (blue/green) behind Nginx
- Health checks on both instances (/health endpoint)
- Deployment via GitHub Actions builds and deploys to green
- Manual traffic switching: SSH to server and call admin endpoint to switch `deployment_slot` cookie
