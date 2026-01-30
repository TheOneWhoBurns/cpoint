# Deployment & CI/CD Pipeline

## Overview

This project uses GitHub Actions for continuous integration and deploys to an EC2 instance running a systemd service.

**Future**: Blue-green deployment infrastructure exists in the repo (`docker-compose.prod.yml`, `nginx.conf`) but is not yet in use. Production currently runs as a single Node.js process via systemd.

## Branch Structure

- **rental-system**: Default branch. Active development and production deployments are triggered from here.

## CI Pipeline

The CI pipeline (`.github/workflows/ci.yml`) runs on every push and PR to `main` or `rental-system`:

1. **Lint**: Code style checks
2. **Type Check**: TypeScript type validation
3. **Tests**: Unit and integration tests
4. **Build**: Production build verification

## Deployment Pipeline

The deployment workflow (`.github/workflows/deploy.yml`) is triggered automatically on every push to **`rental-system`** (including PR merges).

### Deployment Steps

1. GitHub Actions SSHs into EC2 production server
2. `git pull origin rental-system`
3. `npm ci` — install dependencies
4. `npm run build` — build SvelteKit app
5. `npm run db:push` — apply schema changes
6. `sudo systemctl restart rental-app` — restart the Node.js service
7. `curl -f http://localhost:3000/health` — verify app is responding

### Production Environment Setup

#### Required Secrets (GitHub)
Set these in GitHub repo settings → Secrets and variables → Actions:

- `DEPLOY_KEY`: SSH private key for production server
- `DEPLOY_HOST`: Production server IP/hostname
- `DEPLOY_USER`: SSH user for deployments

#### Production Server Setup

1. Install Node.js 20
2. Clone repo to `/opt/rental-system`
3. Configure `.env.production` with `DATABASE_URL` and any other env vars
4. Set up `rental-app` systemd service pointing to the SvelteKit build output
5. Ensure PostgreSQL is running and accessible

#### Health Check

The app exposes a `/health` endpoint:

```bash
curl http://localhost:3000/health
```

## Rollback

To roll back a bad deployment:

1. SSH into production server
2. `cd /opt/rental-system`
3. `git checkout <previous-commit>`
4. `npm ci && npm run build`
5. `sudo systemctl restart rental-app`

## Future: Blue-Green Deployment

The repo contains infrastructure for blue-green deployment that is **not yet active**:

- `docker-compose.prod.yml` — Two app instances (blue on :3000, green on :3001) behind Nginx
- `nginx.conf` — Cookie-based traffic routing via `deployment_slot` cookie
- `/_admin/switch-deployment` endpoint for manual traffic switching

When ready to adopt this strategy, the deploy workflow will need to be updated to build Docker images and orchestrate the blue-green switch.

## Local Development

Install deps and run:

```bash
npm ci
npm run dev
```

For PostgreSQL locally:

```bash
docker-compose up -d
# Set DATABASE_URL env var pointing to local Postgres
npm run dev
```
