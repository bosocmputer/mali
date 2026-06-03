#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
node /app/node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Migrations complete. Starting Next.js..."
exec node server.js
