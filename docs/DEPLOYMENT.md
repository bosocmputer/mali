# MALI Deployment Runbook

> อัปเดต: 17 พฤศจิกายน 2569 — Self-hosted Docker บน Ubuntu (10.158.8.86 ผ่าน ZeroTier VPN)
> Production: `/home/hastax/mali` :3000 กิ่ง `codex/backend-prisma-foundation` · UAT: `/home/hastax/mali-uat` :3001

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
| `CREDENTIALS_KEY` | ✅ | `openssl rand -base64 32` (32 bytes) — เข้ารหัสรหัสเว็บหน่วยงานรัฐและ 2FA secret · **ห้ามเปลี่ยนหรือทำหาย** ข้อมูลที่เข้ารหัสไว้จะอ่านไม่ได้ · ถ้าไม่ตั้ง ระบบใช้ค่าที่สร้างจาก `NEXTAUTH_SECRET` แทน (ตั้งบน prod แล้ว 17 พ.ย. 2569) |
| `MFA_ENFORCED` | — | ค่าเริ่มต้นบังคับ 2FA ทุกบัญชี · `false` = ปิดการบังคับ |
| `AUTH_COOKIE_PREFIX` | — | ชื่อ cookie ของ session (UAT ใช้ `mali-uat` เพื่อไม่ชนกับ prod) |

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
# dump ก่อนทุกครั้งที่มี migration
docker exec mali-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > .deploy-backups/pre-deploy-$(date +%Y%m%d-%H%M%S).dump
git pull
docker compose --env-file .env.production up -d --build app cron   # cron ด้วย ถ้าโค้ดที่ cron ใช้เปลี่ยน
docker compose logs -f app
curl http://localhost:3000/api/health
```

> `prisma migrate deploy` รันอัตโนมัติทุกครั้งที่ container start (ใน `docker-entrypoint.sh`) — ไม่ต้องรันเอง

**ลำดับที่ใช้:** ทดสอบบน UAT ก่อน → ลูกค้ายืนยัน → fast-forward `codex/backend-prisma-foundation` → dump → deploy prod

---

## UAT (ทดสอบก่อนขึ้นจริง)

แยกจาก prod ทั้งหมด: container, ฐานข้อมูล (`mali_uat` ที่ 127.0.0.1:5433), ไฟล์อัปโหลด, cookie · ไม่มี LINE token และไม่มี cron (จะได้ไม่ส่งข้อความหาเจ้าหน้าที่จริง)

```bash
cd /home/hastax/mali-uat
git fetch && git checkout <branch> && git pull
docker compose -p mali-uat -f docker-compose.uat.yml --env-file uat.env up -d --build app
# http://10.158.8.86:3001
```

`uat.env` อยู่บน server เท่านั้น (ไม่ commit) ข้อมูลบน UAT ไม่ย้ายไป prod

---

## 2FA

- บังคับทุกบัญชี (Google Authenticator หรือแอป TOTP อื่น) จำอุปกรณ์ได้ 30 วัน · ออกจากระบบเองเมื่อไม่ได้ใช้งาน 8 ชั่วโมง (เดิม 30 นาที ปรับตามคำขอ 19 พ.ย. 2569)
- ลืมหรือหายมือถือ: กู้ด้วยรหัสที่ส่งไป LINE (ต้องผูก LINE ไว้) หรือให้ผู้จัดการกด "รีเซ็ต 2FA" ในหน้าจัดการผู้ใช้

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

# Backup (custom format)
docker exec mali-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > .deploy-backups/backup_$(date +%Y%m%d).dump

# Restore (ล้างข้อมูลปัจจุบัน — หยุด app/cron ก่อน)
docker exec -i mali-postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < .deploy-backups/<file>.dump
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

ถ้าย้อนข้าม migration ต้อง restore dump ที่ทำก่อน deploy ด้วย (โค้ดเก่าอ่าน schema ใหม่ไม่ได้)

| วันที่ | Deploy | ก่อนหน้า | Dump |
| ---- | ---- | ---- | ---- |
| 17 พ.ย. 2569 | `1a76407` Update 2 รอบ 1–5 + feedback (7 migrations) | `2d5f2cd` | `.deploy-backups/pre-update2-20261117-192921.dump` |

> ไม่มี DB migration rollback อัตโนมัติ — ถ้า migration ใหม่มีปัญหาให้ restore จาก backup
