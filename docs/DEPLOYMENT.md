# MALI Deployment Runbook

> อัปเดต: มิถุนายน 2569 — Self-hosted Docker บน Ubuntu 22.04 (192.168.2.75)

---

## Environment Variables

| Variable | Required | Notes |
| -------- | :------: | ----- |
| `DATABASE_URL` | ✅ | `postgresql://mali:<password>@postgres:5432/mali_prod?schema=public` |
| `POSTGRES_PASSWORD` | ✅ | Password ของ DB user `mali` |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | `http://192.168.2.75:3000` (หรือ domain จริงถ้ามี) |
| `CRON_SECRET` | ✅ | `openssl rand -base64 32` — auth สำหรับ cron endpoints |
| `LINE_CHANNEL_ACCESS_TOKEN` | ⚠️ | ถ้าไม่มี → LINE push ถูก skip silently |
| `LINE_CHANNEL_SECRET` | ⚠️ | สำหรับ HMAC verify ใน webhook |
| `BLOB_READ_WRITE_TOKEN` | ⚠️ | Vercel Blob; ถ้าว่าง → ใช้ local disk (`/app/public/uploads`) |

---

## การ Deploy ครั้งแรก (First Deploy)

```bash
# 1. Clone repo
git clone https://github.com/bosocmputer/mali.git /home/hastax/mali
cd /home/hastax/mali
git checkout codex/backend-prisma-foundation  # หรือ main หลัง merge

# 2. สร้าง .env.production
cp .env.example .env.production
nano .env.production   # แก้ค่าทุก field
chmod 600 .env.production

# 3. Build + start ทุก services
docker compose --env-file .env.production up -d --build

# 4. ดู logs ยืนยัน migrations + app start
docker compose logs -f app

# 5. Seed production data (รันครั้งเดียวเท่านั้น)
docker compose exec app node_modules/.bin/tsx prisma/seed-production.ts

# 6. Health check
curl http://localhost:3000/api/health
# Expected: {"ok":true,"service":"mali","database":"ok",...}
```

**Default login หลัง seed:**
- Email: `admin@hastax.com`
- Password: `Hastax@2024!` ← **เปลี่ยนทันทีหลัง login ครั้งแรก**

---

## Redeploy (Update ระบบ)

```bash
cd /home/hastax/mali
git pull
docker compose --env-file .env.production up -d --build app
docker compose logs -f app
curl http://localhost:3000/api/health
```

> `prisma migrate deploy` รันอัตโนมัติทุกครั้งที่ container start (ใน `docker-entrypoint.sh`) — ไม่ต้องรันเอง

---

## Services

| Container | Image | Port | Role |
| --------- | ----- | ---- | ---- |
| `mali-postgres` | postgres:16-alpine | internal | PostgreSQL database |
| `mali-app` | mali-app (build) | 3000 | Next.js application |
| `mali-cron` | alpine:3.20 | — | Cron scheduler |

```bash
# ดูสถานะทุก service
docker compose ps

# ดู logs
docker compose logs -f app
docker compose logs mali-cron

# Restart service เดียว
docker compose restart app
```

---

## Cron Jobs

| เวลา (Asia/Bangkok) | Endpoint | ทำอะไร |
| ------------------- | -------- | ------- |
| 01:00 | `POST /api/cron/generate-tasks` | สร้าง tasks ใหม่สำหรับทุก client |
| 08:00 | `POST /api/cron/notify?type=d5` | REMINDER งานที่ครบใน 5 วัน |
| 08:00 | `POST /api/cron/notify?type=d1` | ESCALATION งานที่ครบพรุ่งนี้ + notify team lead |
| 09:00 | `POST /api/cron/notify?type=escalation` | ESCALATION งาน OVERDUE ทั้งหมด |

**ทดสอบ cron manual:**
```bash
CRON_SECRET=$(grep CRON_SECRET /home/hastax/mali/.env.production | cut -d'"' -f2)

# dry run generate-tasks
curl -X POST "http://localhost:3000/api/cron/generate-tasks?dryRun=true" \
  -H "Authorization: Bearer $CRON_SECRET"

# test d5 notification
curl -X POST "http://localhost:3000/api/cron/notify?type=d5" \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## LINE Webhook

LINE Webhook ต้องการ HTTPS URL สาธารณะ — ตั้งค่าใน LINE Developers Console:

```
https://<domain>/api/line/webhook
```

**ตัวเลือก:**
1. **Domain จริง** — ตั้ง Nginx reverse proxy + Let's Encrypt SSL (แนะนำสำหรับ production)
2. **ngrok (dev/test)** — `ngrok http 3000` แล้วเอา URL ไปใส่ใน LINE Console

**Account Linking Flow:**
1. User login → ไปหน้า `/profile` → กด "สร้างโค้ด"
2. ระบบสร้าง 6-digit token (10 นาที)
3. User ส่ง `MALI 123456` ให้ LINE OA
4. Webhook รับ → ยืนยัน → ผูก `lineUserId` กับ account

---

## File Upload

| Environment | Storage | Path |
| ----------- | ------- | ---- |
| Production (local disk) | Docker volume `mali_uploads` | `/app/public/uploads/` |
| Production (Vercel Blob) | Vercel Blob CDN | `evidence/<userId>-<timestamp>.<ext>` |

- Max size: **10 MB**
- Allowed types: **PDF, JPG, PNG, WebP**
- ถ้า `BLOB_READ_WRITE_TOKEN` ว่าง → ใช้ local disk อัตโนมัติ

---

## Health Check

```bash
GET /api/health

# Response 200:
{"ok":true,"service":"mali","database":"ok","latencyMs":1,"checkedAt":"..."}

# Response 503 (DB down):
{"ok":false,"service":"mali","database":"error","latencyMs":...}
```

---

## Database

```bash
# เข้า psql โดยตรง
docker compose exec postgres psql -U mali -d mali_prod

# ดู tables
\dt

# Backup
docker compose exec postgres pg_dump -U mali mali_prod > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U mali -d mali_prod
```

---

## Seeds

| Script | ใช้เมื่อ |
| ------ | ------- |
| `prisma/seed-production.ts` | **Production** — สร้าง 1 SUPERVISOR + 15 rules + holidays (ล้าง data เก่าทั้งหมด) |
| `prisma/seed.ts` | **Development** — mock data ครบ (users, clients, tasks, notifications) |

```bash
# Production seed
docker compose exec app node_modules/.bin/tsx prisma/seed-production.ts

# Dev seed (local เท่านั้น)
npm run db:seed
```

---

## Release Gate (ก่อน deploy ทุกครั้ง)

```bash
# บน dev machine
npm run release:check   # lint + test + build

# หลัง deploy
curl http://192.168.2.75:3000/api/health
# Login ทดสอบ → dashboard → tasks → settings
# ทดสอบ cron dry run
```

---

## Rollback

```bash
# กลับไป commit ก่อนหน้า
git log --oneline -5
git checkout <commit-hash>
docker compose --env-file .env.production up -d --build app
```

> ไม่มี DB migration rollback อัตโนมัติ — ถ้า migration ใหม่มีปัญหาให้ restore จาก backup
