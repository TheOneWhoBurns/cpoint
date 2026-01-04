# Deployment & CI/CD Pipeline

## Overview

This project uses GitHub Actions for continuous integration and a blue-green deployment strategy for zero-downtime updates.

## Branch Structure

- **main**: Stable, tested code. Deployments to prod are triggered from here.
- **prod**: Production release tag reference (manual tag-based deployments if needed).
- **rental-system**: Active development branch for MVP features.

## CI Pipeline

The CI pipeline (`.github/workflows/ci.yml`) runs on every push and PR to `main` or `rental-system`:

1. **Lint**: Code style checks
2. **Type Check**: TypeScript type validation
3. **Tests**: Unit and integration tests
4. **Build**: Production build verification

All stages must pass before merging to main.

## Deployment Pipeline

The deployment workflow (`.github/workflows/deploy.yml`) is triggered automatically on every merge to `main`.

### Blue-Green Deployment Strategy

Two identical app instances run in parallel:
- **Blue**: Current production instance serving traffic
- **Green**: New version deployed here first

### Deployment Steps

1. GitHub Actions builds Docker image from latest main commit
2. SSH into production server and pull code
3. Build new Docker image with new tag
4. Start green instance with new image
5. Health check green instance
6. If healthy, switch nginx to route traffic to green
7. Blue becomes the standby instance
8. Next deployment reverses the roles

### Production Environment Setup

#### Required Secrets (GitHub)
Set these in GitHub repo settings → Secrets and variables → Actions:

- `DEPLOY_KEY`: SSH private key for production server
- `DEPLOY_HOST`: Production server IP/hostname
- `DEPLOY_USER`: SSH user for deployments

#### Production Server Setup

1. Install Docker and Docker Compose
2. Clone repo to `/opt/rental-system`
3. Create `.env.production` with:
   ```
   DB_USER=rental
   DB_PASSWORD=<strong-password>
   ```
4. Create SSL certificates directory: `mkdir -p ssl`
5. Add Let's Encrypt certificates to `ssl/` directory

#### Docker Compose Production

```bash
cd /opt/rental-system
docker-compose -f docker-compose.prod.yml up -d
```

This starts:
- PostgreSQL database with persistent volume
- Nginx reverse proxy (port 80/443)
- Two app instances (blue on :3000, green on :3001)

#### Health Checks

Each app instance exposes a `/health` endpoint for monitoring:

```bash
curl http://localhost:3000/health  # Blue
curl http://localhost:3001/health  # Green
```

#### Manual Deployment Switch

If needed, manually switch traffic without deploying:

```bash
ssh user@prod-server curl -X POST http://localhost/_admin/switch-deployment?slot=green
```

## Rollback

Blue-green deployments make rollback simple:

1. If green deployment has issues, keep blue running (traffic stays there)
2. SSH into prod and switch back: `curl -X POST http://localhost/_admin/switch-deployment?slot=blue`
3. Investigate the issue before next deployment

## Monitoring

Check deployment status:

```bash
# Logs
docker-compose -f docker-compose.prod.yml logs -f app-blue
docker-compose -f docker-compose.prod.yml logs -f app-green

# Database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U rental rental_manager | gzip > backup.sql.gz

# Traffic routing
curl -i http://localhost/  # Check which instance responds
```

## Local Development

Install deps and run:

```bash
npm ci
npm run dev
```

This uses SQLite by default. For PostgreSQL locally:

```bash
docker-compose up -d
# Set DATABASE_URL env var pointing to local Postgres
npm run dev
```
