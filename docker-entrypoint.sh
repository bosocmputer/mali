#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
/app/node_modules/.bin/prisma migrate deploy

echo "[entrypoint] Migrations complete. Starting Next.js..."
exec node server.js
