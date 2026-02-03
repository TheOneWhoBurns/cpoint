#!/bin/bash
set -e

echo "=== Rental System Local Launch ==="

if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "Error: Docker daemon is not running. Start Docker Desktop first."
  exit 1
fi

echo "Starting PostgreSQL..."
docker compose up -d db

echo "Waiting for PostgreSQL to be ready..."
until docker compose exec db pg_isready -U rental -d rental_manager &> /dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

echo "Pushing database schema..."
npx drizzle-kit push

echo "Starting dev server..."
npx vite dev
