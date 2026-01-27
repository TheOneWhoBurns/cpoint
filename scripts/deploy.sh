#!/bin/bash
# Deployment script for rental-app on EC2
# Location on server: /opt/rental-system/deploy.sh

set -e

echo "=== Starting deployment ==="
cd /opt/rental-system

echo "=== Pulling latest code ==="
git pull origin rental-system

echo "=== Installing dependencies ==="
npm ci

echo "=== Building application ==="
npm run build

echo "=== Running database migrations ==="
npm run db:push

echo "=== Restarting service ==="
sudo systemctl restart rental-app

echo "=== Waiting for service to start ==="
sleep 3

echo "=== Health check ==="
curl -f http://localhost:3000/health || exit 1

echo "=== Deploy successful ==="
