# MALI — Gap Analysis: สถานะปัจจุบัน vs Requirements

> อัปเดต: มิถุนายน 2569 — **Production deployed บน 192.168.2.75**

---

## สรุปสถานะรวม

| หมวด | Done | Partial | Missing |
|------|:----:|:-------:|:-------:|
| Authentication | 4 | 0 | 0 |
| Client Management | 4 | 0 | 0 |
| Rule Engine | 4 | 0 | 0 |
| Task Management | 4 | 0 | 0 |
| Notification | 5 | 0 | 1 |
| Dashboard & Reporting | 3 | 1 | 1 |
| Infrastructure | 5 | 0 | 0 |

---

## 1. Authentication

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|---------|
| FR-01 | Login Email/Password | ✅ Done | NextAuth v4 + bcrypt(12) |
| FR-02 | Role-based Access Control | ✅ Done | SUPERVISOR / STAFF ตรวจทุก API route |
| FR-03 | Audit Log | ❌ Backlog | ไม่มี audit log — ไม่ block production |
| FR-04 | Logout | ✅ Done | `signOut()` ใน Sidebar |
| — | User Management (SUPERVISOR) | ✅ Done | CRUD + reset password + deactivate |

---

## 2. Client Management

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|---------|
| FR-05 | CRUD บริษัท/ห้างหุ้นส่วนฯ | ✅ Done | PostgreSQL + Repository pattern |
| FR-06 | Non-Standard Fiscal Year | ✅ Done | `isNonStandard`, `fiscalYearStart/End` |
| FR-07 | ประเภทภาษีหลายประเภทต่อบริษัท | ✅ Done | `taxTypes[]` embedded ใน Client |
| FR-08 | วิธียื่น (Paper / e-Filing) | ✅ Done | `filingMethod` ใน DB + UI |
| — | `taxId` เลขนิติบุคคล 13 หลัก | ✅ Done | field ใน DB + UI |
| — | `assignedStaffId` กำหนด Staff | ✅ Done | field ใน DB + UI |

---

## 3. Rule Engine & Deadline Calculation

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|---------|
| FR-09 | คำนวณวันครบกำหนดอัตโนมัติ | ✅ Done | `lib/ruleEngine.ts` + `calculateDueDate()` |
| FR-10 | fixed_day / offset_days / offset_months | ✅ Done | 3 calc methods ครบ |
| FR-11 | เลื่อนวันหยุดราชการ | ✅ Done | `adjustDueDateFromDb()` — query DB จริง |
| FR-12 | แก้ไข Rule จาก UI โดยไม่ต้องแก้ code | ✅ Done | `/settings/rules` CRUD + `lib/repositories/rules.ts` |
| FR-13 | MDD Score & Priority | ✅ Done | field ใน Task + คำนวณตอน generate |

---

## 4. Task Management

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|---------|
| FR-14 | สร้างและมอบหมายงาน (Supervisor) | ✅ Done | CreateTaskModal + auto-generation cron |
| FR-15 | อัปเดตสถานะ TODO → PROCESSING → SUBMITTED | ✅ Done | `PATCH /api/tasks/[id]` + TaskDetailModal |
| FR-16 | อัปโหลดไฟล์หลักฐาน (PDF, JPG, PNG, WebP) | ✅ Done | `POST /api/upload` — local disk / Vercel Blob |
| FR-17 | ค้นหาและกรองงาน | ✅ Done | filter status / month / year / assignee / search |
| — | Task Auto-Generation (cron) | ✅ Done | `POST /api/cron/generate-tasks` รันทุกคืน 01:00 |

---

## 5. Notification

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|---------|
| FR-18 | D-5 REMINDER อัตโนมัติ | ✅ Done | `POST /api/cron/notify?type=d5` — 08:00 ทุกเช้า |
| FR-19 | D-1 Warning + Escalation | ✅ Done | `POST /api/cron/notify?type=d1` — 08:00 ทุกเช้า |
| FR-20 | Escalation งาน OVERDUE | ✅ Done | `POST /api/cron/notify?type=escalation` — 09:00 |
| FR-21 | Manual Escalation (Supervisor) | ✅ Done | `POST /api/notifications/send` + LINE push จริง |
| FR-22 | LINE Messaging API | ✅ Done | push text message, silently skip ถ้าไม่มี token |
| FR-23 | Retry 3 ครั้ง หาก LINE fail | ❌ Backlog | ไม่มี retry — LINE API เรียกครั้งเดียว |
| — | Dedup notification รายวัน | ✅ Done | ตรวจ NotificationLog ก่อนส่งซ้ำ |
| — | LINE Webhook URL (HTTPS) | ⚠️ Pending | ต้องการ domain จริง หรือ ngrok สำหรับ link LINE account |

---

## 6. Dashboard & Reporting

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|---------|
| FR-24 | Dashboard สถานะงานทั้งหมด | ✅ Done | StatsCards, TaskStatusChart, WorkloadChart |
| FR-25 | จำนวนงาน By Priority / Status | ⚠️ Partial | มี By Status แล้ว — By Priority chart ยังไม่มี |
| FR-26 | Export PDF/Excel | ❌ Backlog | ไม่มี |
| FR-27 | ประวัติการแจ้งเตือน | ✅ Done | `/notifications` — history table + summary cards |

---

## 7. Infrastructure & NFR

| NFR | Requirement | สถานะ | หมายเหตุ |
|-----|-------------|:-----:|---------|
| Performance | API < 200ms | ✅ Done | health latency ~1ms บน server จริง |
| Security | bcrypt(12) + JWT + RBAC | ✅ Done | |
| Usability | Responsive Mobile | ✅ Done | Hamburger sidebar + Tailwind breakpoints |
| Availability | Self-hosted production | ✅ Done | Docker Compose on Ubuntu 22.04 |
| Scalability | PostgreSQL + Prisma | ✅ Done | Repository pattern + connection singleton |
| Audit Logging | บันทึกทุก action | ❌ Backlog | |
| WCAG 2.1 AA | Accessibility | ❌ Backlog | ไม่ได้ audit |

---

## Backlog (ไม่ block operation)

| รายการ | Priority |
|--------|---------|
| LINE Webhook HTTPS URL (ngrok / domain) | สูง — block LINE account linking |
| Retry logic สำหรับ LINE API fail | ต่ำ |
| By Priority chart ใน Dashboard | ต่ำ |
| Export PDF / Excel | ต่ำ |
| Audit Log | ต่ำ |
| WCAG 2.1 AA Audit | ต่ำ |
