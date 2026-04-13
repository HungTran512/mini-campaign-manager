#!/bin/sh
set -e
echo "Waiting for PostgreSQL..."
until pg_isready -h "${PGHOST:-postgres}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -q 2>/dev/null; do
  sleep 1
done
echo "Running db:create (idempotent)..."
npm run db:create
echo "Running migrations..."
npm run migrate
echo "Seeding demo data..."
npm run seed:demo
echo "Starting API..."
exec npm run start
