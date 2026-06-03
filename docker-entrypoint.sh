#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy

echo "[entrypoint] Migrations complete. Starting Next.js..."
exec node server.js
