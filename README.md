# MALI — Monthly Automation Line Intelligence

ระบบจัดการงานภาษีอัตโนมัติ สำหรับ supervisor และ staff ติดตาม task ภาษีของผู้ประกอบการ คำนวณวันครบกำหนด และส่ง reminder ผ่าน LINE

---

## สถานะโปรเจค

### Phase 1 — UI & Core Logic (เสร็จแล้ว ✅)

| Feature | สถานะ | หมายเหตุ |
| --- | --- | --- |
| ✅ Auth | **Done** | NextAuth v4, JWT, bcrypt |
| ✅ Dashboard | **Done** | Stats, Charts, Overdue list, Year filter |
| ✅ Client Management | **Done** | CRUD, taxId, filingMethod, assign tax types, confirm delete |
| ✅ Task Management | **Done** | Filter (status/month/year/assignee), pagination |
| ✅ **สร้าง Task ใหม่** | **Done** | Supervisor สร้าง + คำนวณ due date อัตโนมัติ |
| ✅ Calendar | **Done** | Monthly grid, task dots, popover |
| ✅ RBAC | **Done** | SUPERVISOR / STAFF roles |
| ✅ Rule Engine | **Done** | 15 กฎ — fixed_day / offset_days / offset_months |
| ✅ Notification Bell | **Done** | แสดง overdue tasks ใน navbar dropdown |
| ✅ Toast | **Done** | sonner — success/error แทน alert() |
| ✅ Pagination | **Done** | Tasks และ Clients แสดงครั้งละ 10 รายการ |
| ✅ Mobile Sidebar | **Done** | Hamburger menu — responsive บนจอเล็ก |
| ✅ Profile Page | **Done** | แก้ชื่อ + เปลี่ยน password (`/profile`) |
| ✅ MDD Priority | **Done** | `priority` + `mddScore` field ใน Task |

### Phase 2 — Backend & Integrations (ยังไม่ได้ทำ 🔲)

| Feature | สถานะ | หมายเหตุ |
| --- | --- | --- |
| 🔲 PostgreSQL + Prisma | **TODO** | ยังเป็น in-memory mock (`data/mockData.ts`) |
| 🔲 LINE Messaging API | **TODO** | endpoint log ไว้แล้ว รอ Channel Access Token |
| 🔲 File Upload | **TODO** | ช่อง evidenceUrl ยังเป็น text input ธรรมดา |
| 🔲 Cron Job | **TODO** | D-5, Daily, D-1, Escalation auto-trigger |
| 🔲 Holiday Calendar | **TODO** | เลื่อนวันครบกำหนดที่ตรงวันหยุดราชการ |
| 🔲 Export PDF/Excel | **TODO** | รายงาน |
| 🔲 Audit Log | **TODO** | บันทึกทุก action |

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
│     SUPERVISOR — ดูทุก task, สร้าง, มอบหมาย, ลบ    │
│     STAFF      — ดูเฉพาะงานตัวเอง, อัปเดต status   │
│                                                     │
│  🔌 REST API:                                       │
│     GET/POST/PATCH/DELETE  /api/clients             │
│     GET/POST               /api/tasks               │
│     GET/PATCH              /api/tasks/[id]          │
│     POST                   /api/tasks/preview-due   │
│     GET                    /api/rules               │
│     POST                   /api/notifications/send  │
│     PATCH                  /api/profile             │
│                                                     │
│  🧠 Business Logic:                                 │
│     ruleEngine.ts — 15 กฎ, calculateDueDateByRule() │
│     utils.ts      — formatThaiDate() +543 พ.ศ.      │
│                                                     │
│  🌐 External (TODO):                                │
│     LINE Messaging API  — ส่ง reminder จริง         │
│     Cloud Storage       — เก็บไฟล์หลักฐาน          │
└──────────────────────┬──────────────────────────────┘
                       │ Prisma ORM (Phase 2)
┌──────────────────────▼──────────────────────────────┐
│  3. SERVER DATABASES                                │
│                                                     │
│  ⚠️  ปัจจุบัน: In-Memory (data/mockData.ts)         │
│      รีเซ็ตทุกครั้งที่ restart server               │
│                                                     │
│  🎯  เป้าหมาย: PostgreSQL via Prisma                │
│      (Supabase / Neon / Railway)                    │
└─────────────────────────────────────────────────────┘
```

---

## Tax Deadline Rules (15 กฎ)

### ก. ภาษีรายเดือน — Fixed Day of Next Month

| รหัส | แบบฟอร์ม | ครบกำหนด | อ้างอิง |
| ---- | -------- | -------- | ------- |
| R-01 | ภ.ง.ด.1 | วันที่ 15 เดือนถัดไป | ม.52, 59 |
| R-02 | ภ.ง.ด.3 | วันที่ 15 เดือนถัดไป | ม.3 เตรส |
| R-03 | ภ.ง.ด.53 | วันที่ 15 เดือนถัดไป | ม.3 เตรส |
| R-04 | ภ.พ.30 | วันที่ 23 เดือนถัดไป | ม.83 |
| R-05 | ภ.พ.36 | วันที่ 15 เดือนถัดไป | ม.83/6 |
| R-06 | ประกันสังคม | วันที่ 23 เดือนถัดไป | พ.ร.บ.ประกันสังคม ม.47 |

### ข. ภาษีรายปี — Offset จากวันสิ้นรอบบัญชี

| รหัส | แบบฟอร์ม | ครบกำหนด | อ้างอิง |
| ---- | -------- | -------- | ------- |
| R-07 | AGM | +4 เดือน | ป.พ.พ. ม.1172 |
| R-08 | ส.บช.3 (DBD) | +5 เดือน | พ.ร.บ.การบัญชี ม.11 |
| R-09 | ภ.ง.ด.50 | +150 วัน | ม.68, 69 |
| R-10 | บอจ.5 | +14 วัน จาก AGM | ป.พ.พ. ม.1139 |
| R-15 | ภ.ง.ด.51 | +60 วัน | ม.67 ทวิ |

### ค. Workflow ปิดงบประจำปี

| รหัส | งาน | ครบกำหนด |
| ---- | --- | -------- |
| R-11 | จัดทำงบ (ร่าง) | +2 เดือน |
| R-12 | ผู้สอบบัญชีรับรอง | +3 เดือน |
| R-13 | อนุมัติงบใน AGM | +4 เดือน |
| R-14 | นำส่งงบ DBD | +5 เดือน |

> หมายเหตุ: กรณีตรงวันหยุดราชการ — Phase 2 จะเลื่อนให้อัตโนมัติ

---

## Mock Data (Demo)

| ประเภท | จำนวน |
| ------ | ----- |
| Users | 3 (1 Supervisor, 2 Staff) |
| Clients | 10 บริษัท (หลากธุรกิจ, หลากรอบบัญชี) |
| Tasks | 30 tasks ปี 2025–2026 (ครบทุก status + overdue) |
| Notification Logs | 25 records (REMINDER / ESCALATION / MANUAL) |

---

## Mock Users (Dev)

| Email | Password | Role |
| ----- | -------- | ---- |
| supervisor@mali.com | password123 | SUPERVISOR |
| staff1@mali.com | password123 | STAFF |
| staff2@mali.com | password123 | STAFF |

> ⚠️ ข้อมูลรีเซ็ตทุกครั้งที่ restart server (in-memory)

---

## Critical Files

| ไฟล์ | หน้าที่ |
| ---- | ------- |
| `data/mockData.ts` | Mock data + in-memory CRUD ทั้งหมด |
| `lib/auth.ts` | NextAuth config, JWT callbacks |
| `lib/ruleEngine.ts` | 15 กฎ, calculateDueDateByRule(), TAX_RULE_LIST |
| `lib/utils.ts` | formatThaiDate(), formatDaysRemaining(), cn() |
| `types/index.ts` | TypeScript types + NextAuth module augmentation |
| `docs/GAP_ANALYSIS.md` | วิเคราะห์ gap vs SRS/SDD + Roadmap Phase 2 |

---

## Tech Stack

- **Framework**: Next.js 14 App Router + TypeScript
- **UI**: shadcn/ui, Radix UI, Tailwind CSS, Lucide Icons, Recharts
- **Auth**: NextAuth.js v4, bcryptjs
- **ORM**: Prisma (planned Phase 2)
- **DB**: PostgreSQL — Supabase / Neon / Railway (planned)
- **Notifications**: LINE Messaging API (planned)
- **Storage**: Supabase Storage / Cloudinary (planned)

---

## Getting Started

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) แล้ว login ด้วย `supervisor@mali.com` เพื่อเห็น feature ครบที่สุด
