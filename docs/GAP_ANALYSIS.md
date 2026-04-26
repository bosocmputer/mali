# MALI — Gap Analysis: Code vs. Requirements Documents

> วิเคราะห์เปรียบเทียบ Code ปัจจุบัน (Phase 1) กับเอกสาร SRS v1.0 และ SDD v2.0
> อัปเดต: 2026-04-26

---

## สรุปสถานะรวม

| หมวด | Implemented | Partial | Missing |
|------|:-----------:|:-------:|:-------:|
| Authentication | 3 | 1 | 1 |
| Client Management | 3 | 1 | 2 |
| Rule Engine | 3 | 1 | 2 |
| Task Management | 3 | 1 | 2 |
| Notification | 1 | 1 | 4 |
| Dashboard & Reporting | 3 | 0 | 2 |

---

## 1. Authentication Module

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|----------|
| FR-01 | Login Email/Password HTTPS | ✅ Done | NextAuth v4 CredentialsProvider + bcryptjs |
| FR-02 | Role-based Access Control (Staff/Supervisor) | ✅ Done | ตรวจ `session.user.role` ทุก API route |
| FR-03 | Audit Log ทุก action พร้อม Timestamp | ❌ Missing | ไม่มี audit log table หรือ middleware บันทึก |
| FR-04 | Logout | ✅ Done | `signOut()` ใน Sidebar |

---

## 2. Client Management Module

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|----------|
| FR-05 | CRUD บริษัทลูกค้า | ✅ Done | GET/POST/PATCH/DELETE `/api/clients` |
| FR-06 | Non-Standard Fiscal Year | ✅ Done | `isNonStandard`, `fiscalYearStart/End` |
| FR-07 | ระบุประเภทภาษีหลายประเภทต่อลูกค้า | ✅ Done | `taxTypes[]` embedded ใน Client |
| FR-08 | วิธียื่น (Paper / e-Filing) | ⚠️ Partial | เพิ่ม `filingMethod` ใน type แล้ว แต่ยังไม่มี UI field ใน ClientModal |
| — | `tax_id` เลขนิติบุคคล 13 หลัก | ⚠️ Partial | เพิ่มใน type แล้ว แต่ไม่มีใน UI form และไม่มี validation 13 หลัก |
| — | `assignedStaffId` กำหนด Staff ประจำลูกค้า | ⚠️ Partial | เพิ่มใน type/mock แล้ว แต่ไม่มีใน UI |

**สิ่งที่ต้องทำ (Phase 2):**
- เพิ่ม field `taxId`, `filingMethod`, `assignedStaffId` ใน `ClientModal.tsx`
- Validate รูปแบบ taxId 13 หลัก

---

## 3. Rule Engine & Deadline Calculation

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|----------|
| FR-09 | คำนวณวันครบกำหนดอัตโนมัติ | ✅ Done | `lib/ruleEngine.ts` — `calculateDueDate()`, `TAX_RULES` map |
| FR-10 | รองรับ fixed_day และ offset_days | ⚠️ Partial | มีแค่ offset_days ยังไม่มี fixed_day (เช่น "วันที่ 15 ของเดือน" แบบ hardcode วัน) |
| FR-11 | เลื่อนวันที่ตรงวันหยุดราชการ | ❌ Missing | ไม่มี holiday calendar หรือ logic เลื่อนวัน |
| FR-12 | เพิ่ม/แก้ไข Rule โดยไม่ต้องแก้ Source Code | ❌ Missing | Rule ฝังอยู่ใน `TAX_RULES` constant ต้องแก้ code เสมอ |
| FR-13 | MDD Score & Priority | ⚠️ Partial | เพิ่ม field `mddScore`, `priority` ใน type/mock แล้ว แต่ยังไม่มี logic คำนวณ MDD จริง |

**สิ่งที่ต้องทำ (Phase 2):**
- เพิ่ม Thai public holiday list และ logic เลื่อนวัน
- ย้าย Tax Rules ออกไปเป็น DB table (`tax_rules`) เพื่อให้ Supervisor แก้ได้ผ่าน UI
- Implement MDD Score formula: `MDD = (slack_days / total_window_days) * 100`

---

## 4. Task Management Module

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|----------|
| FR-14 | สร้างและมอบหมายงาน (Supervisor) | ⚠️ Partial | Supervisor reassign ได้ แต่ **ยังสร้าง Task ใหม่เองจาก UI ไม่ได้** — task ถูก generate จาก mock เท่านั้น |
| FR-15 | อัปเดตสถานะ TODO → PROCESSING → SUBMITTED | ✅ Done | `PATCH /api/tasks/[id]` + TaskDetailModal |
| FR-16 | อัปโหลดไฟล์หลักฐาน (PDF, JPG) | ❌ Missing | ยังเป็น text input ธรรมดา (`evidenceUrl`) ไม่ใช่ file upload จริง |
| FR-17 | ค้นหางาน | ✅ Done | filter status/month/year/assignee/search ใน `/api/tasks` |

**สิ่งที่ต้องทำ (Phase 2):**
- เพิ่ม UI "สร้างงานใหม่" ให้ Supervisor (form เลือก Client + TaxType + Staff + Period)
- เชื่อมต่อ File Upload จริง (Supabase Storage / Cloudinary)

---

## 5. Notification Module

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|----------|
| FR-18 | D-5 Alert — LINE Flex Message 5 วันก่อนครบ | ❌ Missing | มีแค่ endpoint log ใน memory ไม่ส่ง LINE จริง |
| FR-19 | Daily Summary ทุกเช้า 08:00 น. | ❌ Missing | ไม่มี Cron Job / scheduler |
| FR-20 | D-1 Warning — วันก่อนครบกำหนด | ❌ Missing | ไม่มี scheduler trigger |
| FR-21 | Escalation Alert อัตโนมัติเมื่องานเกิน | ❌ Missing | ไม่มี auto escalation logic |
| FR-22 | Manual Escalation — Supervisor กดส่ง | ⚠️ Partial | ปุ่มส่ง reminder มีใน UI แต่ไม่ส่ง LINE จริง (`/api/notifications/send` log เท่านั้น) |
| FR-23 | Retry 3 ครั้ง หาก LINE API ล้มเหลว | ❌ Missing | ไม่มี retry logic |

**สิ่งที่ต้องทำ (Phase 2):**
- เชื่อมต่อ LINE Messaging API (Channel Access Token)
- ออกแบบ LINE Flex Message template (D-5, D-1, Escalation)
- ตั้ง node-cron หรือ Vercel Cron Job ทุกวัน 08:00 น.
- Implement retry logic ใน notification service

---

## 6. Dashboard & Reporting

| FR ID | Requirement | สถานะ | หมายเหตุ |
|-------|-------------|:-----:|----------|
| FR-24 | Dashboard สถานะงานทั้งหมด Real-time | ✅ Done | StatsCards, TaskStatusChart, WorkloadChart |
| FR-25 | จำนวนงาน By Priority / Status / Client | ⚠️ Partial | มี By Status และ By Assignee แล้ว แต่ยังไม่มี By Priority (ขาด chart priority) |
| FR-26 | Export PDF/Excel | ❌ Missing | ไม่มี export feature |
| FR-27 | ประวัติการแจ้งเตือน | ❌ Missing | ข้อมูล notification logs มีใน mock แต่ไม่มีหน้า UI แสดง |

**สิ่งที่ต้องทำ (Phase 2):**
- เพิ่ม Priority distribution chart ใน Dashboard
- หน้า Notification History (`/notifications`)
- Export รายงานด้วย `react-pdf` หรือ `xlsx`

---

## 7. Non-Functional Requirements

| NFR | Requirement | สถานะ | หมายเหตุ |
|-----|-------------|:-----:|----------|
| Performance | API < 200ms | ✅ Ready | Next.js API Routes + in-memory ปัจจุบันเร็วมาก |
| Security | HTTPS + bcrypt(12) + JWT | ✅ Done | — |
| Usability | Responsive Mobile | ✅ Done | Hamburger sidebar, Tailwind breakpoints |
| Availability | 99.9% SLA | ✅ Ready | Vercel hosting |
| Scalability | PostgreSQL + Prisma | ❌ Phase 2 | ยังเป็น in-memory |
| Audit Logging | บันทึกทุก action | ❌ Missing | ไม่มี |
| WCAG 2.1 AA | Accessibility | ❌ Missing | ไม่ได้ audit |

---

## 8. สิ่งที่มีใน SDD แต่ยังไม่ implement

| Feature | เอกสารระบุ | สถานะ |
|---------|-----------|:-----:|
| `POST /api/upload` | SDD Architecture Diagram | ❌ Route ไม่มี |
| `GET /api/webhooks/line` | LINE Webhook receiver | ❌ ไม่มี |
| `line_user_id` ใน User | SDD users table | ⚠️ มีใน type/mock แต่ไม่มีใน UI ให้ set |
| `notify_before_days` configurable | SDD tax_rules table | ❌ hardcode 5 วัน |
| Escalation ระดับ CRITICAL | SRS FR-21 | ❌ ไม่มี auto trigger |

---

## 9. สรุป Roadmap Phase 2 (เรียงความสำคัญ)

### ด่วน — ก่อน Production
1. **สร้าง Task ใหม่จาก UI** (Supervisor) — critical workflow ที่ขาดอยู่
2. **File Upload จริง** (Supabase Storage) — เพื่อเก็บหลักฐานการยื่น
3. **LINE Messaging API** — หัวใจของระบบตาม spec
4. **Cron Job** (node-cron / Vercel Cron) — D-5, Daily, D-1, Escalation triggers
5. **PostgreSQL + Prisma** — แทน in-memory mock

### ปานกลาง
6. **Holiday Calendar** — เลื่อนวันหยุดราชการ
7. **MDD Score Calculation** — คำนวณ priority อัตโนมัติ
8. **Notification History Page** — `/notifications`
9. **Client form fields** — taxId, filingMethod, assignedStaffId

### อนาคต
10. **Export PDF/Excel**
11. **Rule Manager UI** — Supervisor แก้ tax rules ผ่าน UI
12. **Audit Log**
13. **WCAG Accessibility Audit**
