# MALI — Monthly Automation Line Intelligence

ระบบจัดการงานภาษีอัตโนมัติ สำหรับ supervisor และ staff ติดตาม task ภาษีของผู้ประกอบการ คำนวณวันครบกำหนด และส่ง reminder ผ่าน LINE

---

## สถานะโปรเจค

### Phase 1 — UI & Core Logic (เสร็จแล้ว ✅)

| Feature | สถานะ | หมายเหตุ |
| --- | --- | --- |
| ✅ Auth | **Done** | NextAuth v4, JWT, bcrypt |
| ✅ Dashboard | **Done** | Stats, Charts, Overdue list, Year filter |
| ✅ Client Management | **Done** | CRUD, assign tax types, confirm delete dialog |
| ✅ Task Management | **Done** | Filter (status/month/year/assignee), pagination |
| ✅ Calendar | **Done** | Monthly grid, task dots, popover |
| ✅ RBAC | **Done** | SUPERVISOR / STAFF roles |
| ✅ Notification Bell | **Done** | แสดง overdue tasks ใน navbar dropdown |
| ✅ Toast | **Done** | sonner — success/error แทน alert() |
| ✅ Pagination | **Done** | Tasks และ Clients แสดงครั้งละ 10 รายการ |
| ✅ Mobile Sidebar | **Done** | Hamburger menu — responsive บนจอเล็ก |
| ✅ Profile Page | **Done** | แก้ชื่อ + เปลี่ยน password (`/profile`) |

### Phase 2 — Backend & Integrations (ยังไม่ได้ทำ 🔲)

| Feature | สถานะ | หมายเหตุ |
| --- | --- | --- |
| 🔲 PostgreSQL + Prisma | **TODO** | ยังเป็น in-memory mock (`data/mockData.ts`) |
| 🔲 LINE Messaging API | **TODO** | ปุ่มส่ง reminder มีแล้ว แต่ยังไม่ส่งจริง |
| 🔲 File Upload | **TODO** | ช่อง evidenceUrl ยังเป็น text input ธรรมดา |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│  1. USER APPLICATION (Browser)                      │
│                                                     │
│  /login  /dashboard  /clients  /tasks  /calendar    │
│                                                     │
│  shadcn/ui + Radix UI + Tailwind CSS + Recharts     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS fetch / signIn()
┌──────────────────────▼──────────────────────────────┐
│  2. SERVER & AUTHORING TOOLS (Next.js API Routes)   │
│                                                     │
│  🔒 Auth: NextAuth v4                               │
│     CredentialsProvider → bcryptjs → JWT (role+id)  │
│                                                     │
│  🛡️ RBAC:                                           │
│     SUPERVISOR — ดูทุก task, มอบหมาย, ลบ, reminder  │
│     STAFF      — ดูเฉพาะงานตัวเอง, อัปเดต status   │
│                                                     │
│  🔌 REST API:                                       │
│     GET/POST/PATCH/DELETE  /api/clients             │
│     GET/PATCH              /api/tasks               │
│     GET/PATCH              /api/tasks/[id]          │
│     GET                    /api/rules               │
│     POST                   /api/notifications/send  │
│     POST                   /api/upload              │
│                                                     │
│  🧠 Business Logic:                                 │
│     ruleEngine.ts — calculateDueDate()              │
│     utils.ts      — formatThaiDate() +543 พ.ศ.      │
│                                                     │
│  🌐 External (TODO):                                │
│     LINE Messaging API  — ส่ง reminder จริง         │
│     Cloud Storage       — เก็บไฟล์หลักฐาน          │
└──────────────────────┬──────────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼──────────────────────────────┐
│  3. SERVER DATABASES                                │
│                                                     │
│  ⚠️  ปัจจุบัน: In-Memory (data/mockData.ts)         │
│      รีเซ็ตทุกครั้งที่ restart server               │
│                                                     │
│  🎯  เป้าหมาย: PostgreSQL via Prisma                │
│      (Supabase / Neon / Railway)                    │
│                                                     │
│  Tables:                                            │
│  User ──────────────── NotificationLog             │
│  Client ─┬──────────── Task                        │
│           └──────────── TaxType ── Rule             │
└─────────────────────────────────────────────────────┘
```

---

## Tax Deadline Rules

| แบบฟอร์ม | ระยะเวลา | ประเภท                              |
| -------- | -------- | ----------------------------------- |
| ภ.ง.ด.50 | +150 วัน | Annual income tax                   |
| ภ.ง.ด.51 | +60 วัน  | Half-year income tax estimate       |
| ภ.พ.30   | +15 วัน  | Monthly VAT                         |
| ภ.ง.ด.1  | +7 วัน   | Monthly withholding tax (employees) |
| ภ.ง.ด.3  | +7 วัน   | Monthly withholding tax (juristic)  |

---

## Database Schema (Target)

```
User          Client           Task
id            id               id
name          companyName      clientId ──→ Client
email         businessType     taxTypeId ──→ TaxType
password      fiscalYearStart  assignedUserId ──→ User
role          fiscalYearEnd    fiscalYearEndDate
lineUserId?   isNonStandard    dueDate
                               ruleUsed
TaxType                        status (TODO|PROCESSING|SUBMITTED)
id                             evidenceUrl?
name                           note?
frequency
clientId ──→ Client       NotificationLog
                               id
Rule                           taskId ──→ Task
id                             userId ──→ User
name                           type (REMINDER|ESCALATION|MANUAL)
daysOffset                     sentAt
taxTypeName
```

---

## Critical Files

| ไฟล์                   | หน้าที่                                                   |
| ---------------------- | --------------------------------------------------------- |
| `data/mockData.ts`     | Mock data + in-memory CRUD (แทนที่ด้วย Prisma ใน Phase 2) |
| `lib/auth.ts`          | NextAuth config, JWT callbacks                            |
| `lib/ruleEngine.ts`    | คำนวณวันครบกำหนด, TAX_RULES map                           |
| `lib/utils.ts`         | formatThaiDate(), formatDaysRemaining(), cn()             |
| `types/index.ts`       | All TypeScript types + NextAuth module augmentation       |
| `prisma/schema.prisma` | DB schema — **ยังไม่ได้สร้าง**                            |

---

## Mock Users (Dev)

| Email               | Password    | Role       |
| ------------------- | ----------- | ---------- |
| supervisor@mali.com | password123 | SUPERVISOR |
| staff1@mali.com     | password123 | STAFF      |
| staff2@mali.com     | password123 | STAFF      |

---

## Tech Stack

- **Framework**: Next.js 14 App Router + TypeScript
- **UI**: shadcn/ui, Radix UI, Tailwind CSS, Lucide Icons, Recharts
- **Auth**: NextAuth.js v4, bcryptjs
- **ORM**: Prisma (planned)
- **DB**: PostgreSQL — Supabase / Neon / Railway (planned)
- **Notifications**: LINE Messaging API (planned)
- **Storage**: S3 / Cloudinary (planned)

---

## Getting Started

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)
