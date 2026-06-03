# Software Requirements Specification (SRS)
## MALI — Monthly Automation Line Intelligence
### ระบบจัดการงานภาษีอัตโนมัติสำหรับสำนักงานบัญชี

---

**เวอร์ชัน:** 2.1  
**วันที่:** มิถุนายน 2569  
**สถานะ:** Production — Deploy บน self-hosted server (192.168.2.75) พร้อมใช้งานจริง  
**อ้างอิงมาตรฐาน:** IEEE 830-1998

---

## สารบัญ

1. [บทนำ](#1-บทนำ)
2. [ภาพรวมระบบ](#2-ภาพรวมระบบ)
3. [ฟีเจอร์ระบบ](#3-ฟีเจอร์ระบบ)
4. [ข้อกำหนด API](#4-ข้อกำหนด-api)
5. [ข้อกำหนด Nonfunctional](#5-ข้อกำหนด-nonfunctional)
6. [Data Models](#6-data-models)
7. [Business Logic — Rule Engine](#7-business-logic--rule-engine)
8. [RBAC — Role-Based Access Control](#8-rbac--role-based-access-control)
9. [Environment Variables](#9-environment-variables)
10. [สถานะการพัฒนาและสิ่งที่เหลือ](#10-สถานะการพัฒนาและสิ่งที่เหลือ)

---

## 1. บทนำ

### 1.1 วัตถุประสงค์

เอกสาร SRS นี้บันทึก requirements ทั้งหมดของระบบ **MALI (Monthly Automation Line Intelligence)** — แพลตฟอร์มจัดการงานยื่นแบบภาษีสำหรับสำนักงานบัญชี ครอบคลุม functional requirements, nonfunctional requirements, data models, business rules, RBAC และสถานะการพัฒนาปัจจุบัน

เอกสารนี้มีไว้สำหรับ:
- ทีมพัฒนา (developers, architects)
- ผู้ว่าจ้าง / เจ้าของผลิตภัณฑ์ (product owner)
- ผู้ทดสอบระบบ (QA engineers)

### 1.2 ขอบเขต (Scope)

MALI เป็นเว็บแอปพลิเคชันที่ช่วยให้สำนักงานบัญชีสามารถ:

- **ติดตามงานภาษี** ของลูกค้าแต่ละรายโดยอัตโนมัติ
- **คำนวณวันครบกำหนดยื่นแบบ** ตามกฎเกณฑ์ภาษีไทย รองรับวันหยุดราชการ
- **มอบหมายและติดตามงาน** ให้พนักงานพร้อมบันทึกหลักฐาน
- **แจ้งเตือนผ่าน LINE** เมื่อใกล้ถึงกำหนด พร้อม escalation อัตโนมัติ
- **จัดการข้อมูลลูกค้า** รวมถึงประเภทภาษีและรอบบัญชี
- **บริหารทีมและผู้ใช้งาน** ภายในสำนักงาน

ระบบไม่ครอบคลุม: การคำนวณตัวเลขภาษี, การยื่นแบบจริงต่อกรมสรรพากร, การบัญชีทั่วไป

### 1.3 คำจำกัดความและคำย่อ

| คำ / ย่อ | ความหมาย |
| --------- | --------- |
| MALI | Monthly Automation Line Intelligence |
| SRS | Software Requirements Specification |
| RBAC | Role-Based Access Control |
| SUPERVISOR | บทบาทผู้จัดการ — สิทธิ์เต็ม |
| STAFF | บทบาทพนักงาน — สิทธิ์จำกัด |
| Task | งานยื่นแบบภาษีหนึ่งรายการ |
| Client | ลูกค้าของสำนักงานบัญชี (นิติบุคคล) |
| TaxType | ประเภทภาษีที่ลูกค้าต้องยื่น เช่น ภ.ง.ด.50 |
| Rule | กฎคำนวณ due date สำหรับ TaxType หนึ่ง |
| Due Date | วันครบกำหนดยื่นแบบ (หลีกเลี่ยงวันหยุด) |
| Fiscal Year | รอบบัญชีของลูกค้า (อาจเป็น non-standard) |
| LINE OA | LINE Official Account สำหรับแจ้งเตือน |
| LINE Webhook | Endpoint รับ event จาก LINE Platform |
| LINE Link Token | Token ชั่วคราวสำหรับผูก LINE userId กับบัญชีผู้ใช้ |
| Escalation | การแจ้งเตือนไปยังหัวหน้าทีมเมื่องานใกล้เกินกำหนด |
| MDD Score | Modified Due Date Score — คะแนนความเร่งด่วนของ task |
| Cron Job | งาน auto-generation ที่ทำงานตามตาราง (รายคืน) |
| Dry Run | โหมดทดสอบ generate task โดยไม่บันทึกจริง |

### 1.4 เอกสารอ้างอิง

- IEEE 830-1998 — IEEE Recommended Practice for Software Requirements Specifications
- ประมวลรัษฎากร (Revenue Code of Thailand)
- พ.ร.บ.การบัญชี พ.ศ. 2543
- พ.ร.บ.ประกันสังคม พ.ศ. 2533
- พ.ร.บ.วิชาชีพบัญชี
- ประมวลกฎหมายแพ่งและพาณิชย์ (ป.พ.พ.)

---

## 2. ภาพรวมระบบ

### 2.1 บริบทของระบบ (Product Perspective)

MALI เป็น web application แบบ full-stack ที่ทำงานบน cloud (Vercel) มีผู้ใช้งานคือบุคลากรภายในสำนักงานบัญชี ระบบทำงานแบบ standalone โดยเชื่อมต่อกับ LINE Messaging API สำหรับแจ้งเตือน และ Google Calendar API สำหรับ sync วันหยุดไทย (planned)

```
┌──────────────────────────────────────────────────────────────┐
│                      Browser (User)                           │
│               SUPERVISOR / STAFF                              │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼─────────────────────────────────────┐
│                 Next.js App (Vercel)                           │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Pages         │  │   API Routes     │  │  Auth        │  │
│  │  (Server       │  │   /api/*         │  │  NextAuth v4 │  │
│  │  Components)   │  │                  │  │  JWT         │  │
│  └────────────────┘  └────────┬─────────┘  └──────────────┘  │
│                               │                               │
│  ┌────────────────────────────▼────────────────────────────┐  │
│  │  Business Logic                                          │  │
│  │  ruleEngine.ts · taskGenerator.ts · taskGenerationUtils │  │
│  │  userManagement.ts · lineWebhook.ts · holidays.ts        │  │
│  └────────────────────────────┬────────────────────────────┘  │
│                               │                               │
│  ┌────────────────────────────▼────────────────────────────┐  │
│  │  Repositories (lib/repositories/)                        │  │
│  │  tasks · clients · rules · holidays · teams · users      │  │
│  │  notifications · lineLinks                               │  │
│  └────────────────────────────┬────────────────────────────┘  │
│                               │ Prisma ORM                    │
│  ┌────────────────────────────▼────────────────────────────┐  │
│  │  PostgreSQL Database                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│  External Services                                            │
│  LINE Messaging API (ส่งข้อความ + webhook รับคำสั่ง)          │
│  Google Calendar API (sync วันหยุดไทย — planned)              │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Tech Stack

| Layer | Technology | สถานะ |
| ----- | ---------- | ----- |
| Framework | Next.js 14 (App Router) | ✅ ใช้งานแล้ว |
| Language | TypeScript | ✅ ใช้งานแล้ว |
| Styling | Tailwind CSS + shadcn/ui (Radix UI) | ✅ ใช้งานแล้ว |
| Auth | NextAuth.js v4, CredentialsProvider, JWT | ✅ ใช้งานแล้ว |
| Charts | Recharts | ✅ ใช้งานแล้ว |
| Toast | Sonner | ✅ ใช้งานแล้ว |
| ORM | Prisma (type-safe, PostgreSQL adapter) | ✅ ใช้งานแล้ว |
| Database | PostgreSQL | ✅ Schema + migrations พร้อม |
| Theme | next-themes (dark/light/system) | ✅ ใช้งานแล้ว |
| Validation | Zod | ✅ ใช้งานใน API ทุกตัว |
| LINE | LINE Messaging API | ✅ Webhook + ส่งข้อความ implement แล้ว |
| Cron | Vercel Cron (CRON_SECRET protected) | ✅ Endpoint พร้อม |
| Deploy | Vercel (auto-deploy จาก `main` branch) | ✅ ใช้งานแล้ว |

### 2.3 กลุ่มผู้ใช้งาน (User Classes)

#### SUPERVISOR (ผู้จัดการ)
- มีสิทธิ์เข้าถึงข้อมูลและ action ทั้งหมด
- สร้าง/แก้ไข/ลบ: ลูกค้า, งาน, กฎภาษี, วันหยุด, ทีม, ผู้ใช้งาน
- มอบหมายงานและ reassign ได้
- ส่ง LINE Reminder/Escalation ได้
- ดู WorkloadChart แยกตาม staff ได้
- เข้าถึงเมนู "ตั้งค่าระบบ" ทั้งหมด

#### STAFF (พนักงาน)
- เห็นเฉพาะงานที่ assigned ให้ตัวเอง
- อัปเดตสถานะงาน, เพิ่ม note, แนบ evidenceUrl
- ดู Dashboard, Calendar, Notifications ของตัวเอง
- ไม่สามารถลบ client, แก้ไขกฎภาษี, จัดการทีม หรือจัดการผู้ใช้งาน

### 2.4 สภาพแวดล้อมการทำงาน (Operating Environment)

- **Platform:** Web browser (Chrome, Safari, Firefox, Edge) บน Desktop และ Mobile
- **Internet:** ต้องการ internet connection ตลอดเวลา
- **Deployment:** Vercel serverless functions (Node.js runtime)
- **Database:** PostgreSQL (Supabase / Neon / Railway หรือ self-hosted)
- **Dark Mode:** รองรับ system preference + manual toggle

### 2.5 ข้อสมมติฐานหลัก (Assumptions)

- ลูกค้าทุกรายเป็น **นิติบุคคลจดทะเบียน** ในประเทศไทย
- รอบบัญชีกำหนดตาม "เดือน" (fiscalYearEnd = 1–12)
- วันหยุดราชการไทยถูกบันทึกใน database และ up-to-date
- ผู้ใช้ทุกคนมี email + password (ไม่รองรับ OAuth ภายนอก)
- LINE OA ตั้งค่าแล้วและมี Channel Secret + Access Token

---

## 3. ฟีเจอร์ระบบ

### 3.1 Authentication & Session Management

**ID:** F-01 | **ลำดับ:** Critical | **สถานะ:** ✅ สมบูรณ์

**คำอธิบาย:** ระบบ login/logout ด้วย email + password พร้อม JWT session management

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-01-1 | ผู้ใช้ต้อง login ด้วย email + password ก่อนเข้าทุก page | ✅ |
| F-01-2 | Password ผ่าน bcryptjs hash verification | ✅ |
| F-01-3 | JWT token มี `id` และ `role` ของผู้ใช้ | ✅ |
| F-01-4 | ถ้าไม่มี session → redirect ไป `/login` | ✅ |
| F-01-5 | Logout จาก Navbar dropdown | ✅ |
| F-01-6 | Login page รองรับ dark mode | ✅ |

---

### 3.2 Dashboard

**ID:** F-02 | **ลำดับ:** High | **สถานะ:** ✅ สมบูรณ์

**คำอธิบาย:** หน้าสรุปภาพรวมงานภาษี — SUPERVISOR เห็นทุก task, STAFF เห็นเฉพาะของตัวเอง

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-02-1 | Stats Cards: งานทั้งหมด, เกินกำหนด, กำลังดำเนินการ, รอดำเนินการ, ยื่นแล้ว | ✅ |
| F-02-2 | MonthProgressCard กรองได้ 5 tab: ทั้งหมด / รายเดือน / รายปี / Workflow / เกินกำหนด | ✅ |
| F-02-3 | WorkloadChart (bar chart) แสดงงานต่อเดือน รวม bar สีแดงสำหรับ overdue | ✅ |
| F-02-4 | UrgentTaskList — รายการงาน "ใกล้ครบกำหนด" เรียงตาม due date | ✅ |
| F-02-5 | SUPERVISOR เห็น WorkloadChart แยกตาม staff | ✅ |
| F-02-6 | Server Component — render ทันทีโดยไม่ต้องรอ client fetch | ✅ |

---

### 3.3 ข้อมูลลูกค้า (Client Management)

**ID:** F-03 | **ลำดับ:** Critical | **สถานะ:** ✅ สมบูรณ์

**คำอธิบาย:** จัดการข้อมูลลูกค้านิติบุคคลพร้อมประเภทภาษีและรอบบัญชี

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-03-1 | ตารางลูกค้า: ชื่อบริษัท, เลขนิติบุคคล, ประเภทธุรกิจ, วันสิ้นรอบบัญชี (DD/MM พ.ศ.), งานค้าง | ✅ |
| F-03-2 | คอลัมน์ "งานค้าง" เป็น Popover แสดง tax type + due date color-coded | ✅ |
| F-03-3 | SUPERVISOR เพิ่ม/แก้ไข/ลบลูกค้า; STAFF ดูอย่างเดียว | ✅ |
| F-03-4 | Form: ชื่อบริษัท, taxId (13 หลัก), ประเภทธุรกิจ, วันสิ้นรอบบัญชี, วิธียื่น, เลือก taxTypes | ✅ |
| F-03-5 | fiscalYearStart คำนวณอัตโนมัติจาก fiscalYearEnd (ไม่ต้องกรอก) | ✅ |
| F-03-6 | SUPERVISOR กด "สร้างงาน" เพื่อ generate tasks ทุก taxType ของลูกค้า | ✅ |

---

### 3.4 จัดการงาน (Task Management)

**ID:** F-04 | **ลำดับ:** Critical | **สถานะ:** ✅ สมบูรณ์

**คำอธิบาย:** ตารางงานยื่นแบบภาษีพร้อม modal อัปเดตสถานะ

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-04-1 | ตาราง: ลูกค้า, ประเภทภาษี, กำหนดส่ง, สถานะ, ผู้รับผิดชอบ, ความเร่งด่วน | ✅ |
| F-04-2 | STAFF เห็นเฉพาะงานที่ assigned ให้ตัวเอง | ✅ |
| F-04-3 | กรองได้: สถานะ, เดือน, ปี, assignee, ค้นหาชื่อลูกค้า | ✅ |
| F-04-4 | OVERDUE = virtual filter (TODO/PROCESSING ที่ dueDate < วันนี้) | ✅ |
| F-04-5 | TaskDetailModal: section อัปเดตสถานะ (ด้านบน), ข้อมูล task | ✅ |
| F-04-6 | Stepper สถานะ: รอดำเนินการ → กำลังดำเนินการ → ยื่นแล้ว | ✅ |
| F-04-7 | STAFF บันทึก note และ evidenceUrl | ✅ |
| F-04-8 | SUPERVISOR reassign งานให้ staff คนอื่น | ✅ |
| F-04-9 | สถานะ badge: เทา / น้ำเงิน / เขียว / แดง (OVERDUE) | ✅ |

---

### 3.5 ปฏิทินภาษี (Tax Calendar)

**ID:** F-05 | **ลำดับ:** High | **สถานะ:** ✅ สมบูรณ์

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-05-1 | ปฏิทินรายเดือน — dot สีบนวันที่มีงาน | ✅ |
| F-05-2 | คลิกวันที่ → popover รายการงานในวันนั้น | ✅ |
| F-05-3 | วันที่เลือกแสดง ring highlight + badge "เลือกอยู่" | ✅ |
| F-05-4 | Filter tabs: ทั้งหมด / รายเดือน / รายปี / เกินกำหนด | ✅ |
| F-05-5 | ไป prev/next เดือนได้ | ✅ |

---

### 3.6 การแจ้งเตือนและ LINE Integration

**ID:** F-06 | **ลำดับ:** High | **สถานะ:** ✅ Implement แล้ว (ต้องตั้งค่า ENV)

**คำอธิบาย:** ระบบแจ้งเตือนผ่าน LINE พร้อม escalation อัตโนมัติและ webhook รับคำสั่ง

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-06-1 | ตารางประวัติการแจ้งเตือน: วันที่, ลูกค้า, ประเภทงาน, ประเภท, ผู้ส่ง | ✅ |
| F-06-2 | ประเภทแจ้งเตือน: REMINDER, ESCALATION, MANUAL | ✅ |
| F-06-3 | Summary cards จำนวนแต่ละประเภท | ✅ |
| F-06-4 | Navbar bell icon แสดง badge งานเกินกำหนด + ใกล้ถึงกำหนด | ✅ |
| F-06-5 | ส่ง LINE push message ไปยัง `lineUserId` ของ staff ที่ assigned | ✅ |
| F-06-6 | Escalation อัตโนมัติ: ถ้างาน due ในวันพรุ่งนี้และยังไม่ยื่น → แจ้งหัวหน้าทีมด้วย | ✅ |
| F-06-7 | SUPERVISOR สามารถส่ง REMINDER หรือ ESCALATION แบบ manual ได้จาก TaskDetailModal | ✅ |
| F-06-8 | ถ้าไม่มี `LINE_CHANNEL_ACCESS_TOKEN` → บันทึก log โดยไม่ส่งข้อความ (silent skip) | ✅ |

**LINE Webhook (รับคำสั่งจาก LINE):**

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-06-9 | Endpoint `POST /api/line/webhook` รับ event จาก LINE Platform | ✅ |
| F-06-10 | ตรวจสอบ HMAC-SHA256 signature ทุก request | ✅ |
| F-06-11 | คำสั่ง `MALI <token>` — ผูก LINE userId กับบัญชีผู้ใช้ระบบ | ✅ |
| F-06-12 | คำสั่ง `test` — ตอบยืนยัน webhook ทำงานปกติ | ✅ |
| F-06-13 | คำสั่งอื่นๆ — ตอบ help message | ✅ |

**LINE Link Token (ผูกบัญชี):**

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-06-14 | ผู้ใช้กด "เชื่อม LINE" จากหน้าโปรไฟล์ → ระบบสร้าง token อายุ 10 นาที | ✅ |
| F-06-15 | ผู้ใช้ส่งข้อความ `MALI <token>` ใน LINE OA → ระบบผูก lineUserId กับ account | ✅ |
| F-06-16 | Token ใช้ได้ครั้งเดียว (consumed หลังใช้) และ hash ด้วย SHA-256 ก่อนเก็บใน DB | ✅ |

---

### 3.7 โปรไฟล์ผู้ใช้ (User Profile)

**ID:** F-07 | **ลำดับ:** Medium | **สถานะ:** ✅ สมบูรณ์

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-07-1 | แก้ไขชื่อผู้ใช้ | ✅ |
| F-07-2 | เปลี่ยน password (ต้องกรอก current password ยืนยัน) | ✅ |
| F-07-3 | แสดง role (ไม่สามารถเปลี่ยนจากหน้านี้) | ✅ |
| F-07-4 | สร้าง LINE Link Token เพื่อผูก LINE account | ✅ |

---

### 3.8 ตั้งค่า — วันหยุด (Holiday Management)

**ID:** F-08 | **ลำดับ:** High | **สถานะ:** ✅ สมบูรณ์  
**เข้าถึงได้:** SUPERVISOR เท่านั้น

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-08-1 | ตารางวันหยุดราชการ: วันที่, ชื่อ TH/EN, ประเภท | ✅ |
| F-08-2 | ประเภท: public_holiday / special_holiday / government_holiday / substitution_holiday | ✅ |
| F-08-3 | เพิ่ม/แก้ไข/ลบวันหยุดได้ | ✅ |
| F-08-4 | SyncHolidayModal — sync วันหยุดจาก Google Calendar API | ✅ (mock data ปี 2568–2569 ใช้ได้ก่อน) |
| F-08-5 | แสดง warning banner เมื่อยังไม่ได้ตั้งค่า Google Calendar API | ✅ |
| F-08-6 | Sync ต้อง deduplicate ตาม date | ✅ |

---

### 3.9 ตั้งค่า — กฎภาษี (Tax Rule Management)

**ID:** F-09 | **ลำดับ:** High | **สถานะ:** ✅ สมบูรณ์  
**เข้าถึงได้:** SUPERVISOR เท่านั้น

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-09-1 | ตารางกฎภาษี: ruleCode, ชื่อ, แบบฟอร์ม, calcMethod, offset/fixedDay, อ้างอิงกฎหมาย | ✅ |
| F-09-2 | เพิ่ม/แก้ไข/ลบกฎได้ | ✅ |
| F-09-3 | calcMethod 3 แบบ: fixed_day, offset_days, offset_months | ✅ |
| F-09-4 | referenceDate: month_end / fiscal_year_end / agm_date | ✅ |
| F-09-5 | Warning banner เมื่อแก้ไขกฎที่มีอยู่ (กระทบ task ที่สร้างแล้ว) | ✅ |

---

### 3.10 ตั้งค่า — ทีม (Team Management)

**ID:** F-10 | **ลำดับ:** Medium | **สถานะ:** ✅ สมบูรณ์  
**เข้าถึงได้:** SUPERVISOR เท่านั้น

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-10-1 | ตารางทีม: ชื่อทีม, หัวหน้าทีม, จำนวนสมาชิก | ✅ |
| F-10-2 | สร้าง/แก้ไข/ลบทีม | ✅ |
| F-10-3 | กำหนดหัวหน้าทีม (leadUserId) และสมาชิก (ผ่าน TeamMember join table) | ✅ |
| F-10-4 | Client ผูกกับทีมได้ (teamId) | ✅ |

---

### 3.11 ตั้งค่า — จัดการผู้ใช้ (User Management)

**ID:** F-11 | **ลำดับ:** High | **สถานะ:** ✅ สมบูรณ์  
**เข้าถึงได้:** SUPERVISOR เท่านั้น

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-11-1 | ตารางผู้ใช้: ชื่อ, อีเมล, บทบาท, สถานะ (active/inactive) | ✅ |
| F-11-2 | SUPERVISOR สร้างผู้ใช้ใหม่ กำหนด name, email, role, password | ✅ |
| F-11-3 | ถ้าไม่กรอก password → ระบบ generate temporary password อัตโนมัติ (min 14 ตัวอักษร ประกอบ upper/lower/digit/symbol) | ✅ |
| F-11-4 | SUPERVISOR แก้ไข name, role, isActive ของผู้ใช้ได้ | ✅ |
| F-11-5 | SUPERVISOR reset password ของผู้ใช้ได้ (ระบบ generate password ใหม่หรือกำหนดเอง) | ✅ |
| F-11-6 | SUPERVISOR ปิดการใช้งาน (isActive = false) ผู้ใช้ได้ — แต่ปิดบัญชีตัวเองไม่ได้ | ✅ |
| F-11-7 | SUPERVISOR ไม่สามารถลด role ตัวเองออกจาก SUPERVISOR | ✅ |
| F-11-8 | Email ต้อง unique ทั้งระบบ | ✅ |

---

### 3.12 คู่มือการใช้งาน (User Guide)

**ID:** F-12 | **ลำดับ:** Low | **สถานะ:** ✅ สมบูรณ์

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-12-1 | คู่มือแบบ Accordion | ✅ |
| F-12-2 | เนื้อหาปรับตาม role: SUPERVISOR เห็นส่วนจัดการระบบ | ✅ |
| F-12-3 | มี flow diagram สถานะงาน, ตารางกฎภาษี, FAQ | ✅ |

---

### 3.13 Task Auto-Generation

**ID:** F-13 | **ลำดับ:** Critical | **สถานะ:** ✅ สมบูรณ์

**คำอธิบาย:** สร้าง task อัตโนมัติเมื่อ SUPERVISOR สั่ง หรือผ่าน Cron Job รายคืน

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-13-1 | Generate tasks สำหรับทุก taxType ของลูกค้าที่เลือก | ✅ |
| F-13-2 | คำนวณ due date ด้วย ruleEngine + หลีกเลี่ยงวันหยุดและวันเสาร์-อาทิตย์ | ✅ |
| F-13-3 | Unique constraint: ไม่สร้าง task ซ้ำสำหรับ `clientId + taxTypeId + fiscalYearEndDate` | ✅ |
| F-13-4 | คำนวณ fiscalYearEndDate รอบถัดไปอัตโนมัติ (`getNextFiscalYearEndDate`) | ✅ |
| F-13-5 | Cron job `POST /api/cron/generate-tasks` ทำงานรายคืน ป้องกันด้วย `CRON_SECRET` | ✅ |
| F-13-6 | รองรับ `dryRun=true` — preview จำนวนงานที่จะสร้างโดยไม่บันทึก | ✅ |
| F-13-7 | บันทึก `TaskGenerationRun` ทุกครั้ง: จำนวน created, skipped, errors, triggeredBy | ✅ |

---

### 3.14 Health Check

**ID:** F-14 | **ลำดับ:** Medium | **สถานะ:** ✅ สมบูรณ์

| ID | ข้อกำหนด | สถานะ |
| ---- | --------- | ------- |
| F-14-1 | `GET /api/health` — ตรวจสอบ database connection | ✅ |
| F-14-2 | Response มี: `ok`, `database`, `latencyMs`, `checkedAt` | ✅ |
| F-14-3 | ถ้า DB down → 503 Service Unavailable | ✅ |

---

## 4. ข้อกำหนด API

### 4.1 Authentication

| Method | Route | Auth | Description |
| -------- | ------- | ------ | ------------- |
| POST | `/api/auth/[...nextauth]` | No | Sign-in (NextAuth) |
| GET | `/api/auth/[...nextauth]` | No | Session / callback |

### 4.2 Tasks

| Method | Route | Role | Description |
| -------- | ------- | ------ | ------------- |
| GET | `/api/tasks` | All | ดึง task list พร้อม filter (ดู Query Params ด้านล่าง) |
| POST | `/api/tasks` | SUPERVISOR | สร้าง task ใหม่ |
| GET | `/api/tasks/[id]` | All* | ดึง task เดี่ยว |
| PATCH | `/api/tasks/[id]` | All* | อัปเดต status / note / evidenceUrl / assignedUserId |
| POST | `/api/tasks/preview-due` | All | Preview due date สำหรับ taxType + fiscalYearEndDate |
| GET | `/api/tasks/[id]/next-cycle` | SUPERVISOR | Preview task รอบบัญชีถัดไป |

*STAFF เห็นเฉพาะ task ที่ assigned ให้ตัวเอง

**Query Parameters — GET `/api/tasks`:**

| Parameter | Type | Description |
| ----------- | ------ | ------------- |
| `status` | `TODO\|PROCESSING\|SUBMITTED\|OVERDUE` | กรองตามสถานะ |
| `month` | `1–12` | กรองตามเดือนของ due date |
| `year` | `number` | กรองตามปีของ due date |
| `assignedUserId` | `string` | กรองตาม assignee |
| `search` | `string` | ค้นหาจากชื่อลูกค้า |

### 4.3 Clients

| Method | Route | Role | Description |
| -------- | ------- | ------ | ------------- |
| GET | `/api/clients` | All | ดึงรายชื่อลูกค้า |
| POST | `/api/clients` | SUPERVISOR | สร้างลูกค้าใหม่ |
| PATCH | `/api/clients` | SUPERVISOR | แก้ไขข้อมูลลูกค้า |
| DELETE | `/api/clients` | SUPERVISOR | ลบลูกค้า |
| POST | `/api/clients/[id]/generate-tasks` | SUPERVISOR | Generate tasks สำหรับลูกค้า |

### 4.4 Rules

| Method | Route | Role | Description |
| -------- | ------- | ------ | ------------- |
| GET | `/api/rules` | All | ดึงกฎทั้งหมด |
| POST | `/api/rules` | SUPERVISOR | สร้างกฎใหม่ |
| PATCH | `/api/rules` | SUPERVISOR | แก้ไขกฎ |
| DELETE | `/api/rules` | SUPERVISOR | ลบกฎ |

### 4.5 Holidays

| Method | Route | Role | Description |
| -------- | ------- | ------ | ------------- |
| GET | `/api/holidays` | All | ดึงวันหยุดทั้งหมด |
| POST | `/api/holidays` | SUPERVISOR | เพิ่มวันหยุด |
| PATCH | `/api/holidays` | SUPERVISOR | แก้ไขวันหยุด |
| DELETE | `/api/holidays` | SUPERVISOR | ลบวันหยุด |
| POST | `/api/holidays/sync` | SUPERVISOR | Sync วันหยุด (deduplicate by date) |

### 4.6 Teams

| Method | Route | Role | Description |
| -------- | ------- | ------ | ------------- |
| GET | `/api/teams` | All | ดึงทีมทั้งหมด |
| POST | `/api/teams` | SUPERVISOR | สร้างทีม |
| PATCH | `/api/teams` | SUPERVISOR | แก้ไขทีม |
| DELETE | `/api/teams` | SUPERVISOR | ลบทีม |

### 4.7 Users

| Method | Route | Role | Description |
| -------- | ------- | ------ | ------------- |
| GET | `/api/users` | SUPERVISOR | ดึงรายชื่อ user ทั้งหมด |
| POST | `/api/users` | SUPERVISOR | สร้าง user ใหม่ |
| PATCH | `/api/users` | SUPERVISOR | แก้ไข user / reset password |

**Request Body — PATCH `/api/users` (reset password):**

```json
{
  "id": "user_id",
  "resetPassword": true,
  "password": "optional_custom_password"
}
```

ถ้าไม่ส่ง `password` → ระบบ generate temporary password อัตโนมัติและส่งกลับใน response

### 4.8 Notifications

| Method | Route | Role | Description |
| -------- | ------- | ------ | ------------- |
| GET | `/api/notifications` | All | ดึงประวัติการแจ้งเตือน |
| POST | `/api/notifications/send` | SUPERVISOR | ส่งการแจ้งเตือน + บันทึก log |

**Escalation Logic (POST /api/notifications/send):**
- ถ้า task due พรุ่งนี้และ status ≠ SUBMITTED → เพิ่ม team lead เป็น recipient อัตโนมัติ
- ถ้า type = ESCALATION → เพิ่ม team lead โดยไม่ขึ้นกับวัน
- ค้นหาทีมจาก `client.teamId` ก่อน ถ้าไม่มีค้นจาก staff membership

### 4.9 User Profile

| Method | Route | Role | Description |
| -------- | ------- | ------ | ------------- |
| PATCH | `/api/profile` | All | อัปเดตชื่อหรือ password |
| POST | `/api/profile/line-link-token` | All | สร้าง LINE Link Token (อายุ 10 นาที) |

### 4.10 LINE

| Method | Route | Auth | Description |
| -------- | ------- | ------ | ------------- |
| POST | `/api/line/webhook` | LINE Signature | รับ event จาก LINE Platform |

**LINE Webhook — คำสั่งที่รองรับ:**

| ข้อความที่ส่งมา | การตอบสนอง |
| ---------------- | ----------- |
| `MALI <token>` | ผูก LINE userId กับบัญชีผู้ใช้ |
| `test` | ตอบยืนยัน webhook ทำงานปกติ |
| อื่นๆ | ตอบ help message แนะนำคำสั่ง |

### 4.11 Cron & Health

| Method | Route | Auth | Description |
| -------- | ------- | ------ | ------------- |
| POST | `/api/cron/generate-tasks` | CRON_SECRET header | Auto-generate tasks รายคืน |
| GET | `/api/health` | No | Health check + database ping |

**Query Parameters — POST `/api/cron/generate-tasks`:**

| Parameter | Type | Description |
| ----------- | ------ | ------------- |
| `dryRun` | `true\|false` | Preview โดยไม่บันทึก (default: false) |

---

## 5. ข้อกำหนด Nonfunctional

### 5.1 Performance

| ID | ข้อกำหนด |
| ---- | --------- |
| NF-01 | Page load time < 2 วินาที (Next.js Server Components + Vercel Edge) |
| NF-02 | API response time < 500ms สำหรับ request ปกติ |
| NF-03 | รองรับผู้ใช้งานพร้อมกัน ≥ 20 คน |

### 5.2 Security

| ID | ข้อกำหนด |
| ---- | --------- |
| NF-04 | ทุก page ต้อง require authentication |
| NF-05 | ทุก API route ต้อง verify JWT ก่อนดำเนินการ |
| NF-06 | Password hash ด้วย bcryptjs — ห้าม plain text |
| NF-07 | SUPERVISOR-only routes return 403 ถ้า role ไม่ตรง |
| NF-08 | LINE Webhook ต้อง verify HMAC-SHA256 signature ทุก request |
| NF-09 | LINE Link Token hash ด้วย SHA-256 ก่อนเก็บ DB — ห้าม plain text |
| NF-10 | Cron endpoint ป้องกันด้วย `CRON_SECRET` header |
| NF-11 | Zod validation ใน API ทุกตัว — ห้ามรับ input ที่ไม่ผ่าน schema |

### 5.3 Usability

| ID | ข้อกำหนด |
| ---- | --------- |
| NF-12 | UI ภาษาไทยเป็นหลัก |
| NF-13 | วันที่แสดงเป็น พ.ศ. (Buddhist Era, +543) |
| NF-14 | Responsive: รองรับ Mobile (min 375px) และ Desktop |
| NF-15 | Dark Mode (system preference + manual toggle) |
| NF-16 | Toast notification แสดงผลทุก action (success/error) |
| NF-17 | Confirm dialog ก่อนดำเนินการลบข้อมูล |

### 5.4 Reliability

| ID | ข้อกำหนด |
| ---- | --------- |
| NF-18 | ข้อมูลคงอยู่ใน PostgreSQL — ต้องมี backup policy |
| NF-19 | Cron job ต้องมี error handling และบันทึก `TaskGenerationRun` ทุกครั้ง |
| NF-20 | LINE webhook ต้อง return 200 ภายใน 5 วินาที (LINE timeout) |

### 5.5 Maintainability

| ID | ข้อกำหนด |
| ---- | --------- |
| NF-21 | TypeScript strict mode — types กำหนดใน `types/index.ts` |
| NF-22 | Business logic แยกออกจาก API routes (lib/ruleEngine, lib/taskGenerator, lib/userManagement) |
| NF-23 | Database access ผ่าน repository pattern (lib/repositories/) เท่านั้น |
| NF-24 | ต้องมี unit tests สำหรับ: lineWebhook, taskGenerator, userManagement |

---

## 6. Data Models

### 6.1 User

```typescript
interface User {
  id: string
  name: string
  email: string               // unique
  password: string            // bcrypt hash
  role: "SUPERVISOR" | "STAFF"
  isActive: boolean           // default true
  lineUserId?: string         // unique — ผูกกับ LINE
  createdAt: string
}
```

### 6.2 LineLinkToken

```typescript
// Token ชั่วคราวสำหรับผูก LINE account (อายุ 10 นาที, ใช้ได้ครั้งเดียว)
interface LineLinkToken {
  id: string
  userId: string
  tokenHash: string           // SHA-256 hash ของ token จริง
  expiresAt: DateTime
  usedAt?: DateTime
  createdAt: DateTime
}
```

### 6.3 Team และ TeamMember

```typescript
interface Team {
  id: string
  name: string
  leadUserId: string
  createdAt: string
}

// Join table — ความสัมพันธ์ many-to-many ระหว่าง Team และ User
interface TeamMember {
  teamId: string
  userId: string
  createdAt: DateTime
}
```

### 6.4 Client

```typescript
interface Client {
  id: string
  companyName: string
  taxId?: string              // เลขนิติบุคคล 13 หลัก
  businessType: string
  fiscalYearStart: number     // 1–12 (คำนวณอัตโนมัติ)
  fiscalYearEnd: number       // 1–12
  fiscalYearEndDay: number    // 1–31
  isNonStandard: boolean      // true ถ้า FY ไม่ใช่ Jan–Dec
  filingMethod?: "PAPER" | "E_FILING"
  assignedStaffId?: string
  teamId?: string
  createdAt: string
}
```

### 6.5 TaxType

```typescript
interface TaxType {
  id: string
  name: string                // เช่น "ภ.ง.ด.50"
  frequency: "MONTHLY" | "ANNUAL" | "ANNUAL_WORKFLOW"
  clientId: string
  assignedStaffId?: string
}
// unique constraint: (clientId, name)
```

### 6.6 Rule

```typescript
interface Rule {
  id: string
  ruleCode: string            // unique เช่น "R-01"
  name: string
  description?: string
  taxForm?: string            // เช่น "ภ.ง.ด.50"
  calcMethod: "fixed_day" | "offset_days" | "offset_months"
  fixedDay?: number           // สำหรับ fixed_day
  offset?: number             // สำหรับ offset_days / offset_months
  referenceDate: "month_end" | "fiscal_year_end" | "agm_date"
  legalRef: string
  updatedAt?: DateTime
}
```

### 6.7 Task

```typescript
interface Task {
  id: string
  clientId: string
  taxTypeId: string
  assignedUserId: string
  fiscalYearEndDate: DateTime
  dueDate: DateTime
  ruleUsed?: string           // ruleCode ที่ใช้คำนวณ
  status: "TODO" | "PROCESSING" | "SUBMITTED"
  priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  mddScore?: number
  evidenceUrl?: string
  note?: string
  createdAt: DateTime
  updatedAt: DateTime
}
// unique constraint: (clientId, taxTypeId, fiscalYearEndDate)
```

### 6.8 TaskGenerationRun

```typescript
// บันทึกประวัติทุกครั้งที่มีการ generate tasks
interface TaskGenerationRun {
  id: string
  scope: string               // "all" หรือ clientId เดี่ยว
  clientId?: string
  dryRun: boolean
  status: string              // "completed" | "error"
  created: number             // จำนวน task ที่สร้างจริง
  skipped: number             // จำนวน task ที่ข้ามเพราะมีอยู่แล้ว
  wouldCreate: number         // จำนวนที่จะสร้าง (dry run)
  errors: Json
  triggeredBy?: string        // "cron" | userId
  startedAt: DateTime
  completedAt?: DateTime
}
```

### 6.9 NotificationLog

```typescript
interface NotificationLog {
  id: string
  taskId: string
  userId: string
  type: "REMINDER" | "ESCALATION" | "MANUAL"
  sentAt: DateTime
}
```

### 6.10 ThaiHoliday

```typescript
interface ThaiHoliday {
  id: string
  date: DateTime              // unique — Date only (no time)
  nameTh: string
  nameEn: string
  type: "public_holiday" | "special_holiday" | "government_holiday" | "substitution_holiday"
  isSubstitution: boolean
  note?: string
}
```

---

## 7. Business Logic — Rule Engine

### 7.1 ภาพรวม

`lib/ruleEngine.ts` คำนวณ due date จาก TaxRule + base date ทั้งหมดใช้ **UTC arithmetic** เพื่อป้องกัน timezone drift

### 7.2 Calculation Methods

| calcMethod | ตรรกะ | ตัวอย่าง |
| ----------- | ------- | --------- |
| `fixed_day` | วันที่ fixedDay ของเดือนถัดไปจาก base date | base = 31 มี.ค., fixedDay = 15 → 15 เม.ย. |
| `offset_days` | base + N วัน (UTC) | FY end = 31 ธ.ค., offset = 150 → 29 พ.ค. ปีถัดไป |
| `offset_months` | วันสุดท้ายของเดือนที่ base + N เดือน | FY end = 31 ธ.ค., offset = 5 → 31 พ.ค. |

### 7.3 Reference Dates

| referenceDate | ความหมาย |
| -------------- | --------- |
| `month_end` | วันสุดท้ายของเดือนภาษี (ใช้กับภาษีรายเดือน) |
| `fiscal_year_end` | วันสิ้นสุดรอบบัญชีของลูกค้า |
| `agm_date` | วันประชุมผู้ถือหุ้น — ใช้สำหรับ บอจ.5 (R-10) |

### 7.4 Holiday-Safe Calculation

Due date ที่คำนวณได้จะถูก shift ไปวันทำการถัดไป ถ้าตรงกับ:
1. วันเสาร์หรือวันอาทิตย์
2. วันหยุดราชการในตาราง `ThaiHoliday`

วน loop จนกว่าจะได้วันทำการ

### 7.5 กฎภาษีทั้งหมด 15 รายการ

#### ก. ภาษีรายเดือน

| ruleCode | ชื่อ | แบบฟอร์ม | กำหนดส่ง | อ้างอิงกฎหมาย |
| ---------- | ----- | --------- | --------- | ------------- |
| R-01 | หัก ณ ที่จ่าย (เงินเดือน) | ภ.ง.ด.1 | วันที่ 15 เดือนถัดไป | ป.รัษฎากร ม.52, 59 |
| R-02 | หัก ณ ที่จ่าย (บุคคลธรรมดา) | ภ.ง.ด.3 | วันที่ 15 เดือนถัดไป | ป.รัษฎากร ม.3 เตรส |
| R-03 | หัก ณ ที่จ่าย (นิติบุคคล) | ภ.ง.ด.53 | วันที่ 15 เดือนถัดไป | ป.รัษฎากร ม.3 เตรส |
| R-04 | VAT ปกติ | ภ.พ.30 | วันที่ 23 เดือนถัดไป | ป.รัษฎากร ม.83 |
| R-05 | VAT ต่างประเทศ | ภ.พ.36 | วันที่ 15 เดือนถัดไป | ป.รัษฎากร ม.83/6 |
| R-06 | ประกันสังคม | ประกันสังคม | วันที่ 23 เดือนถัดไป | พ.ร.บ.ประกันสังคม ม.47 |

#### ข. ภาษีรายปีและงานประจำปี

| ruleCode | ชื่อ | แบบฟอร์ม | กำหนดส่ง | อ้างอิงกฎหมาย |
| ---------- | ----- | --------- | --------- | ------------- |
| R-07 | ประชุมผู้ถือหุ้น (AGM) | AGM | +4 เดือน จาก FY end | ป.พ.พ. ม.1172 |
| R-08 | ยื่นงบการเงิน (DBD) | ส.บช.3 | +5 เดือน จาก FY end | พ.ร.บ.การบัญชี ม.11 |
| R-09 | ภาษีเงินได้นิติบุคคล | ภ.ง.ด.50 | +150 วัน จาก FY end | ป.รัษฎากร ม.68, 69 |
| R-10 | รายชื่อผู้ถือหุ้น (บอจ.5) | บอจ.5 | +14 วัน จาก AGM date | ป.พ.พ. ม.1139 |
| R-15 | ภ.ง.ด.51 กึ่งปี | ภ.ง.ด.51 | +60 วัน จาก FY end | ป.รัษฎากร ม.67 ทวิ |

#### ค. งบการเงินประจำปี Workflow

| ruleCode | ชื่อ | แบบฟอร์ม | กำหนดส่ง | อ้างอิงกฎหมาย |
| ---------- | ----- | --------- | --------- | ------------- |
| R-11 | จัดทำงบการเงิน (ร่าง) | จัดทำงบ | +2 เดือน จาก FY end | พ.ร.บ.การบัญชี ม.11 |
| R-12 | ผู้สอบบัญชีรับรองงบ | ผู้สอบบัญชี | +3 เดือน จาก FY end | พ.ร.บ.วิชาชีพบัญชี ม.40 |
| R-13 | อนุมัติงบในที่ประชุม AGM | อนุมัติงบ | +4 เดือน จาก FY end | ป.พ.พ. ม.1172 |
| R-14 | นำส่งงบการเงิน (DBD) | ส.บช.3 | +5 เดือน จาก FY end | พ.ร.บ.การบัญชี ม.11 |

---

## 8. RBAC — Role-Based Access Control

### 8.1 Matrix สิทธิ์การใช้งาน

| Feature | SUPERVISOR | STAFF |
| --------- |:---------:|:-----:|
| Dashboard — ทุก staff | ✅ | ❌ (เฉพาะตัวเอง) |
| Tasks — ดูทุก task | ✅ | ❌ (assigned เท่านั้น) |
| Tasks — อัปเดตสถานะ/note/evidence | ✅ | ✅ |
| Tasks — reassign | ✅ | ❌ |
| Clients — ดู | ✅ | ✅ |
| Clients — เพิ่ม/แก้ไข | ✅ | ❌ |
| Clients — ลบ | ✅ | ❌ |
| Clients — Generate Tasks | ✅ | ❌ |
| Calendar | ✅ | ✅ (tasks ของตัวเอง) |
| Notifications — ดู log | ✅ | ✅ |
| Notifications — ส่ง LINE | ✅ | ❌ |
| Settings / Holidays | ✅ | ❌ |
| Settings / Rules | ✅ | ❌ |
| Settings / Teams | ✅ | ❌ |
| Settings / Users | ✅ | ❌ |
| Profile — แก้ไขของตัวเอง | ✅ | ✅ |
| Guide | ✅ (เต็ม) | ✅ (จำกัด) |

### 8.2 Business Rules ของ RBAC

| กฎ | รายละเอียด |
| ---- | ---------- |
| Self-protection | SUPERVISOR ไม่สามารถปิดบัญชีตัวเองได้ |
| Role lock | SUPERVISOR ไม่สามารถลด role ตัวเองออกจาก SUPERVISOR |
| API enforcement | ทุก API route ต้อง verify JWT + ตรวจ role ก่อนทุก action |
| Data scoping | STAFF — query filter `assignedUserId = session.user.id` ทุกครั้ง |

---

## 9. Environment Variables

| Variable | Required | Description |
| ---------- | --------- | ------------- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_URL` | ✅ | URL ของแอป (production หรือ localhost) |
| `NEXTAUTH_SECRET` | ✅ | Secret สำหรับ JWT signing + LINE token hash |
| `LINE_CHANNEL_ACCESS_TOKEN` | ⚠️ | LINE OA Access Token (ถ้าไม่มี — ส่งข้อความ LINE จะ skip) |
| `LINE_CHANNEL_SECRET` | ⚠️ | LINE OA Channel Secret (ต้องมีเพื่อ verify webhook signature) |
| `CRON_SECRET` | ⚠️ | Secret สำหรับ protect cron endpoint |

> **⚠️ = Optional แต่ฟีเจอร์ที่เกี่ยวข้องจะทำงานไม่ครบ**

---

## 10. สถานะการพัฒนา

### 10.1 สรุปสถานะปัจจุบัน (มิถุนายน 2569 — Production)

| หมวด | รายการ | สถานะ |
| ------ | ------- | ------- |
| **Core UI** | Dashboard, Tasks, Clients, Calendar, Notifications, Profile, Guide | ✅ สมบูรณ์ |
| **Settings** | Holidays, Rules, Teams, Users | ✅ สมบูรณ์ |
| **Database** | PostgreSQL 16, Prisma 7, 5 migrations, repositories ครบทุก model | ✅ Production |
| **Auth** | Login, JWT, RBAC, User Management | ✅ สมบูรณ์ |
| **Rule Engine** | 15 กฎ, 3 calcMethods, holiday-safe (DB จริง) | ✅ สมบูรณ์ |
| **Task Generation** | Manual + Cron 01:00 ทุกคืน, DryRun, audit log | ✅ สมบูรณ์ |
| **LINE Notification** | Push message (REMINDER/ESCALATION/MANUAL), Webhook, Link Token | ✅ พร้อมใช้งาน |
| **Notification Cron** | D-5 (08:00), D-1 + escalation (08:00), OVERDUE (09:00) | ✅ สมบูรณ์ |
| **File Upload** | PDF/JPG/PNG/WebP — local disk (Docker volume) หรือ Vercel Blob | ✅ สมบูรณ์ |
| **Docker Deploy** | Multi-stage Dockerfile, docker-compose (postgres + app + cron) | ✅ Production |
| **Dark Mode / Mobile** | ทุก component, Hamburger sidebar | ✅ สมบูรณ์ |
| **Health Check** | `GET /api/health` — DB ping + latency | ✅ สมบูรณ์ |
| **Unit Tests** | vitest: lineWebhook, taskGenerator, userManagement | ✅ มี |

### 10.2 Backlog (ไม่ block operation)

| รายการ | รายละเอียด | Priority |
| ------- | ---------- | -------- |
| **LINE Webhook HTTPS** | ต้องการ domain จริงหรือ ngrok สำหรับ account linking | สูง |
| **Retry LINE API** | ไม่มี retry logic เมื่อ LINE API fail | ต่ำ |
| **Export PDF/Excel** | ไม่มี export feature | ต่ำ |
| **Audit Log** | ไม่บันทึก action history | ต่ำ |
| **By Priority Chart** | Dashboard ยังไม่มี chart แสดง By Priority | ต่ำ |

### 10.3 Production Deployment (เสร็จแล้ว)

```
[x] Ubuntu 22.04 server — 192.168.2.75
[x] Docker Compose: postgres + app + cron
[x] .env.production ตั้งค่าครบ (DATABASE_URL, NEXTAUTH_SECRET, LINE keys, CRON_SECRET)
[x] prisma migrate deploy — 5 migrations applied
[x] seed-production.ts — 1 SUPERVISOR + 15 rules + 22 holidays
[x] Health check ผ่าน: {"ok":true,"database":"ok"}
[ ] LINE Webhook URL (HTTPS) — รอ domain หรือ ngrok
```

---

*อัปเดต: มิถุนายน 2569 — ระบบ Production พร้อมใช้งาน*
