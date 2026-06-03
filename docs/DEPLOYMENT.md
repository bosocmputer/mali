# MALI Deployment Runbook

## Required Environment Variables

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Production domain e.g. `https://mali.example.com` |
| `CRON_SECRET` | ✅ | Random secret for cron endpoint auth |
| `LINE_CHANNEL_ACCESS_TOKEN` | ⚠️ | Required for LINE push; omit → silently skipped |
| `LINE_CHANNEL_SECRET` | ⚠️ | Required for LINE webhook HMAC verify |
| `BLOB_READ_WRITE_TOKEN` | ⚠️ | Vercel Blob token; omit → files saved locally (dev only) |

---

## Vercel Deployment

### 1. Link project

```bash
vercel link
```

### 2. Set environment variables in Vercel Dashboard

Add all variables from the table above under **Settings → Environment Variables**.

### 3. First deploy

```bash
vercel --prod
```

Vercel auto-runs `npm run build`. The build command in `package.json` should include:

```bash
prisma generate && next build
```

### 4. Run database migrations (first deploy only)

```bash
npx prisma migrate deploy
```

This applies all pending migrations in `prisma/migrations/` against the production DB.

### 5. Seed initial data (first deploy only)

```bash
npx prisma db seed
```

Only run once on a fresh empty database. **Do not run on a database that already has customer data.**

---

## Cron Task Generation

Cron is configured in `vercel.json` — runs daily at 01:00 UTC (08:00 ICT):

```json
{
  "crons": [{ "path": "/api/cron/generate-tasks", "schedule": "0 1 * * *" }]
}
```

Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically. The endpoint also accepts `x-cron-secret` header for local manual testing:

```bash
curl -X POST http://localhost:3000/api/cron/generate-tasks?dryRun=true \
  -H "x-cron-secret: <CRON_SECRET>"
```

Every run (cron or manual) is recorded in `TaskGenerationRun`.

---

## LINE Webhook

After Vercel assigns the production domain, configure in LINE Developers Console:

```text
https://<vercel-domain>/api/line/webhook
```

Enable webhook and verify the signature is working by sending `test` to the LINE OA.

### Account Linking Flow

1. User logs in to MALI.
2. Opens Profile page → clicks "สร้างโค้ด".
3. Sends `MALI 123456` to the LINE OA within 10 minutes.
4. Webhook verifies and links `lineUserId` to the user account.

---

## File Upload

| Environment | Storage | Path |
| ----------- | ------- | ---- |
| Production (Vercel) | Vercel Blob | `evidence/<userId>-<timestamp>.<ext>` |
| Local dev | `public/uploads/` | `/uploads/<userId>-<timestamp>.<ext>` |

Max size: 10 MB. Allowed types: PDF, JPG, PNG, WebP.

---

## Health Check

```text
GET /api/health
```

Returns `200 {"status":"ok","db":"connected"}` or `503 {"status":"error","db":"disconnected"}`.

---

## Release Gate

Before every production deploy:

```bash
npm run release:check
npx prisma migrate deploy
curl https://<vercel-domain>/api/health
```

Post-deploy smoke test:

- Login as supervisor.
- Open dashboard, clients, tasks, settings, notifications.
- Run cron dry-run.
- Create LINE link code from Profile.
- Send `test` to LINE OA.

### Rollback

Revert to the previous Vercel deployment via the dashboard. Do **not** roll back database migrations unless the migration is proven destructive and a tested rollback SQL exists.
