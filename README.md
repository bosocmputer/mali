# MALI — Monthly Automation Line Intelligence

ระบบจัดการงานภาษีอัตโนมัติ สำหรับสำนักงานบัญชี — ติดตามงานยื่นแบบภาษีของลูกค้า คำนวณวันครบกำหนด แจ้งเตือนทีมผ่าน LINE

---

## สถานะโปรเจค — Production Ready ✅

**อัปเดต:** มิถุนายน 2569 | **Branch หลัก:** `main` | **Server:** 192.168.2.75:3000

---

## Features ทั้งหมด

### UI / Frontend
| Feature | หมายเหตุ |
|---------|---------|
| ✅ Auth (Login / Logout) | NextAuth v4, JWT, bcrypt(12) |
| ✅ Dashboard | Stats cards, WorkloadChart, UrgentTaskList, MonthProgressCard |
| ✅ Task Management | Filter, pagination, status stepper, file upload |
| ✅ Client Management | CRUD, taxId, filingMethod, pending tasks popover |
| ✅ Calendar | Monthly grid + task dot + popover |
| ✅ Notifications | History table + summary cards |
| ✅ Profile | แก้ชื่อ, เปลี่ยน password, LINE link token |
| ✅ Settings / Holidays | CRUD + sync modal |
| ✅ Settings / Rules | Tax rule CRUD (15 กฎ) |
| ✅ Settings / Teams | Team management |
| ✅ Settings / Users | User CRUD + reset password (SUPERVISOR only) |
| ✅ Guide | Accordion, role-aware |
| ✅ Dark Mode | next-themes, system preference |
| ✅ Mobile Responsive | Hamburger sidebar |

### Backend
| Feature | หมายเหตุ |
|---------|---------|
| ✅ PostgreSQL + Prisma 7 | Schema, 5 migrations, PrismaClient singleton |
| ✅ Repository Pattern | `lib/repositories/` ครบทุก model |
| ✅ RBAC | ตรวจ role ทุก API route |
| ✅ LINE Messaging API | Push notification — REMINDER / ESCALATION / MANUAL |
| ✅ LINE Webhook | HMAC-SHA256 verify, commands: link/test/help |
| ✅ LINE Link Token | 6-digit, SHA-256, 10 นาที, one-time, atomic transaction |
| ✅ User Management | สร้าง/แก้ไข/deactivate, temporary password |
| ✅ File Upload | Vercel Blob (prod) หรือ local disk fallback |
| ✅ Task Auto-Generation | Manual + cron รายคืน, dry run, audit log |
| ✅ Health Check | `GET /api/health` — DB ping + latency |
| ✅ Unit Tests | vitest: lineWebhook, taskGenerator, userManagement |

### Cron Jobs (ทำงานอัตโนมัติทุกวัน)
| เวลา | งาน |
|------|-----|
| 01:00 | Auto-generate tasks สำหรับทุก client |
| 08:00 | D-5 REMINDER — แจ้งเตือนงานที่ครบใน 5 วัน |
| 08:00 | D-1 ESCALATION — แจ้งเตือน + notify team lead งานที่ครบพรุ่งนี้ |
| 09:00 | ESCALATION — แจ้งเตือนงาน OVERDUE ทั้งหมด |

### Infrastructure
| รายการ | รายละเอียด |
|--------|-----------|
| ✅ Docker | Multi-stage Dockerfile (deps → builder → runner) |
| ✅ Docker Compose | 3 services: postgres, app, cron |
| ✅ Self-hosted | Ubuntu 22.04, 12 cores, 16 GB RAM, 468 GB disk |
| ✅ Health check | node http probe บน `/api/health` |
| ✅ Named volumes | `mali_postgres_data`, `mali_uploads` |

---

## Stack

| ส่วน | Technology |
|------|-----------|
| Framework | Next.js 14 App Router, TypeScript |
| UI | shadcn/ui (Radix UI + Tailwind CSS), Recharts |
| Auth | NextAuth.js v4 (CredentialsProvider + JWT) |
| Database | PostgreSQL 16, Prisma 7 (`@prisma/adapter-pg`) |
| Messaging | LINE Messaging API |
| File Storage | Vercel Blob / local disk fallback |
| Testing | vitest |
| Deployment | Docker Compose on Ubuntu 22.04 |

---

## Backlog (ไม่ block operation)

| รายการ | Priority |
|--------|---------|
| LINE Webhook URL (ต้องการ HTTPS — ngrok หรือ domain จริง) | สูง |
| Export PDF / Excel | ต่ำ |
| Audit Log | ต่ำ |

---

## การ Deploy

ดูขั้นตอนเต็มที่ [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

**Quick start (server):**
```bash
git clone https://github.com/bosocmputer/mali.git /opt/mali
cd /opt/mali
cp .env.example .env.production   # แก้ค่าทุก field
docker compose --env-file .env.production up -d --build
docker compose exec app node_modules/.bin/tsx prisma/seed-production.ts
curl http://localhost:3000/api/health
```

**Default login (production):**
- Email: `admin@hastax.com`
- Password: `Hastax@2024!` ← เปลี่ยนทันทีหลัง login ครั้งแรก

---

## Architecture

```
[Browser / LAN]
      │ HTTP port 3000
      ▼
┌─────────────────┐     ┌────────────────────┐
│  Next.js App    │────▶│  PostgreSQL 16      │
│  (Docker)       │     │  (Docker)           │
└─────────────────┘     └────────────────────┘
         │
         │ LINE Messaging API (push)
         ▼
    LINE Official Account
         │
         │ Webhook (requires HTTPS domain)
         ▼
    POST /api/line/webhook

┌─────────────────┐
│  Cron (Alpine)  │──▶ POST /api/cron/generate-tasks  01:00
│  (Docker)       │──▶ POST /api/cron/notify?type=d5  08:00
└─────────────────┘──▶ POST /api/cron/notify?type=d1  08:00
                   ──▶ POST /api/cron/notify?type=escalation  09:00
```
