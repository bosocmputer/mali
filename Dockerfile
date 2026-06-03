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

# Build Next.js standalone output
# Dummy env vars needed so lib/db.ts and next-auth don't throw during static analysis
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    NEXTAUTH_SECRET="build-secret" \
    NEXTAUTH_URL="http://localhost:3000" \
    npm run build

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

# Prisma schema + migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Full node_modules from deps stage — needed so prisma CLI has all transitive deps
# (effect, @prisma/config, etc.) when running migrate deploy at entrypoint
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Overwrite prisma client with the generated one from builder (includes lib/generated/prisma)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# uploads dir — will be overlaid by the named volume mount at runtime
RUN mkdir -p /app/public/uploads && chown nextjs:nodejs /app/public/uploads

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
