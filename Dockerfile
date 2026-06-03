# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (lib/generated/prisma/ is not tracked in git)
# DATABASE_URL required by prisma.config.ts even at generate time — dummy value is fine here
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

# Build Next.js standalone output (DATABASE_URL not needed at build time)
RUN npm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone server bundle (includes its own minimal node_modules trace)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Static assets (CSS, JS chunks) — not included in standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Font files
COPY --from=builder --chown=nextjs:nodejs /app/app/fonts ./app/fonts

# Prisma schema + migrations (needed by prisma migrate deploy at entrypoint)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Prisma CLI and engine packages so `prisma migrate deploy` works in runner
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# uploads dir — will be overlaid by the named volume mount at runtime
RUN mkdir -p /app/public/uploads && chown nextjs:nodejs /app/public/uploads

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
