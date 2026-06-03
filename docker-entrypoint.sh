#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
# Pass DATABASE_URL explicitly via --url to bypass prisma.config.ts (which requires tsx at runtime)
/app/node_modules/.bin/prisma migrate deploy \
  --schema=/app/prisma/schema.prisma \
  --url="${DATABASE_URL}"

echo "[entrypoint] Migrations complete. Starting Next.js..."
exec node server.js
