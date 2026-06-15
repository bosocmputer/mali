# MALI — System Logic Review for Documentation Team
> ตรวจสอบจาก source code และ server จริง | วันที่: 2026-06-12

---

## วัตถุประสงค์

เอกสารนี้จัดทำขึ้นเพื่อให้ทีมเอกสารทราบว่า **สิ่งที่เขียนในเอกสารปัจจุบัน (SDD) ตรงกับการทำงานจริงหรือไม่** พร้อมระบุจุดที่ต้องแก้ไขหรือตัดสินใจว่าจะใช้เวอร์ชันไหน

---

## 1. Platform / Deployment

### เอกสารปัจจุบันระบุว่า
> "ติดตั้งและให้บริการบนแพลตฟอร์ม Vercel"

### ความจริงจาก server (192.168.2.75)

ระบบ **ไม่ได้ deploy บน Vercel** — ใช้ self-hosted บน Ubuntu 22.04 LTS ด้วย Docker Compose ประกอบด้วย 3 containers:

| Container | Image | หน้าที่ | Port |
|---|---|---|---|
| `mali-app` | Next.js (custom build) | Web application | 3000 |
| `mali-postgres` | postgres:16-alpine | ฐานข้อมูล | 5432 (internal) |
| `mali-cron` | alpine:3.20 | รัน cron jobs | — |

> **หมายเหตุ:** ไฟล์ `vercel.json` ถูกลบออกจาก repo แล้ว เพื่อไม่ให้สับสนกับ deployment จริง

### สิ่งที่ทีมเอกสารต้องตัดสินใจ
- แก้เป็น "Self-hosted บน Ubuntu 22.04 LTS ด้วย Docker Compose"

---

## 2. Cron Jobs

### เอกสารปัจจุบันระบุว่า
> "ระบบ Cron Job ที่ทำงานทุกวันเวลา 01:00 UTC"

### ความจริงจาก `docker-compose.yml`

มี **4 cron jobs** รันโดย container `mali-cron` (Alpine Linux) โดยเรียก HTTP ไปหา `app:3000` ภายใน Docker network:

| เวลา (UTC) | Endpoint | ประเภท | หน้าที่ |
|---|---|---|---|
| 01:00 | `/api/cron/generate-tasks` | POST | สร้าง task ภาษีอัตโนมัติสำหรับลูกค้าทุกราย |
| 08:00 | `/api/cron/notify?type=d7` | POST | แจ้งเตือน LINE ล่วงหน้า 7 วัน (REMINDER) |
| 08:00 | `/api/cron/notify?type=d1` | POST | แจ้งเตือน LINE ก่อนครบกำหนด 1 วัน (ESCALATION) |
| 09:00 | `/api/cron/notify?type=escalation` | POST | แจ้งเตือนงาน overdue ทุกวัน (ESCALATION) |

### สิ่งที่ทีมเอกสารต้องตัดสินใจ
- แก้จาก "1 cron job" → "4 cron jobs" และระบุเวลาและหน้าที่ให้ครบ

---

## 3. ตารางในฐานข้อมูล

### เอกสารปัจจุบันระบุว่า
> "ตารางผู้ใช้งาน (User), ตารางลูกค้า (Client), ตารางงาน (Task), ตารางกฎภาษี (Rule), ตารางวันหยุดราชการ (ThaiHoliday), ตารางบันทึกการแจ้งเตือน (NotificationLog)"

### ความจริงจาก `prisma/schema.prisma`

ตารางทั้งหมดใน database (mali_prod):

| ตาราง | สถานะในเอกสาร | หน้าที่ |
|---|---|---|
| `User` | มีอยู่แล้ว | ผู้ใช้งานระบบ (STAFF / SUPERVISOR) |
| `Client` | มีอยู่แล้ว | ข้อมูลลูกค้า |
| `Task` | มีอยู่แล้ว | งานภาษีแต่ละรายการ |
| `Rule` | มีอยู่แล้ว | กฎการคำนวณ due date |
| `ThaiHoliday` | มีอยู่แล้ว | วันหยุดราชการไทย |
| `NotificationLog` | มีอยู่แล้ว | บันทึกการส่งแจ้งเตือน |
| `TaxType` | **ขาดหายไปในเอกสาร** | ประเภทภาษีของแต่ละลูกค้า (ตัวเชื่อมระหว่าง Client → Task) |
| `Team` | **ขาดหายไปในเอกสาร** | ทีมงาน |
| `TeamMember` | **ขาดหายไปในเอกสาร** | สมาชิกทีม (many-to-many: Team ↔ User) |
| `LineLinkToken` | **ขาดหายไปในเอกสาร** | Token สำหรับ link บัญชี LINE ของ staff |
| `TaskGenerationRun` | **ขาดหายไปในเอกสาร** | Log การรัน task generation แต่ละครั้ง |

### สิ่งที่ทีมเอกสารต้องตัดสินใจ
- เพิ่มตารางที่ขาดหายไปทั้ง 5 ตาราง

---

## 4. สูตรคำนวณ Due Date (Rule Engine)

### เอกสารปัจจุบันระบุว่า
> "Rule Engine สำหรับคำนวณวันครบกำหนดภาษี" (ไม่ได้ระบุรายละเอียด)

### ความจริงจาก `lib/ruleEngine.ts`

ระบบรองรับ **3 CalcMethod** (ไม่ใช่ 2 อย่างที่ระบุในเอกสาร SRS):

---

#### CalcMethod 1: `fixed_day` — วันที่คงที่ของเดือนถัดไป

```
due date = วันที่ {fixedDay} ของเดือนถัดจาก base date
```

| กฎ | แบบฟอร์ม | fixedDay | อ้างอิง |
|---|---|---|---|
| R-01 | ภ.ง.ด.1 | 15 | ป.รัษฎากร ม.52, 59 |
| R-02 | ภ.ง.ด.3 | 15 | ป.รัษฎากร ม.3 เตรส |
| R-03 | ภ.ง.ด.53 | 15 | ป.รัษฎากร ม.3 เตรส |
| R-04 | ภ.พ.30 | 23 | ป.รัษฎากร ม.83 |
| R-05 | ภ.พ.36 | 15 | ป.รัษฎากร ม.83/6 |
| R-06 | ประกันสังคม | 23 | พ.ร.บ.ประกันสังคม ม.47 |

**ตัวอย่าง:** ลูกค้ายื่น ภ.ง.ด.1 เดือนมีนาคม 2026
- base date = 31 มี.ค. 2026
- due date = **15 เม.ย. 2026**

---

#### CalcMethod 2: `offset_days` — บวกจำนวนวันจาก base date

```
due date = base date + {offset} วัน
```

| กฎ | แบบฟอร์ม | offset | base date | อ้างอิง |
|---|---|---|---|---|
| R-09 | ภ.ง.ด.50 | +150 วัน | FY end | ป.รัษฎากร ม.68, 69 |
| R-10 | บอจ.5 | +14 วัน | AGM date | ป.พ.พ. ม.1139 |
| R-15 | ภ.ง.ด.51 | +60 วัน | FY end | ป.รัษฎากร ม.67 ทวิ |

**ตัวอย่าง:** ลูกค้า FY end = 31 ธ.ค. 2025, ภ.ง.ด.50 (offset +150)
- base date = 31 ธ.ค. 2025
- due date = **29 พ.ค. 2026**

---

#### CalcMethod 3: `offset_months` — วันสุดท้ายของเดือนที่ N หลัง base date

```
due date = วันสุดท้ายของเดือน (base month + {offset})
```

| กฎ | แบบฟอร์ม | offset | base date | อ้างอิง |
|---|---|---|---|---|
| R-07 | AGM | +4 เดือน | FY end | ป.พ.พ. ม.1172 |
| R-08 | ส.บช.3 | +5 เดือน | FY end | พ.ร.บ.การบัญชี ม.11 |
| R-11 | จัดทำงบ (ร่าง) | +2 เดือน | FY end | พ.ร.บ.การบัญชี ม.11 |
| R-12 | ผู้สอบบัญชี | +3 เดือน | FY end | พ.ร.บ.วิชาชีพบัญชี ม.40 |
| R-13 | อนุมัติงบ AGM | +4 เดือน | FY end | ป.พ.พ. ม.1172 |
| R-14 | นำส่ง DBD | +5 เดือน | FY end | พ.ร.บ.การบัญชี ม.11 |

**ตัวอย่าง:** ลูกค้า FY end = 31 ธ.ค. 2025, AGM (offset +4 เดือน)
- base date = 31 ธ.ค. 2025
- due date = **30 เม.ย. 2026** (วันสุดท้ายของเดือนที่ 4)

### สิ่งที่ทีมเอกสารต้องตัดสินใจ
- SRS ระบุว่ารองรับ "2 รูปแบบ" — ความจริงมี **3 รูปแบบ** ต้องแก้ไขให้ครบ

---

## 5. การแจ้งเตือนผ่าน LINE

### เอกสารปัจจุบันระบุว่า
> "แจ้งเตือนล่วงหน้า **7 วัน**" และ "แจ้งเตือนอีกครั้งก่อน **1 วัน**"

### ความจริงจาก `app/api/cron/notify/route.ts` และ `docker-compose.yml`

| trigger | เวลา (UTC) | เงื่อนไข | ประเภท notification | ผู้รับ |
|---|---|---|---|---|
| D-7 | 08:00 | dueDate = วันนี้ + 7 วัน | REMINDER | Staff ที่รับผิดชอบ |
| D-1 | 08:00 | dueDate = วันนี้ + 1 วัน | **ESCALATION** | Staff + Team Lead |
| Escalation | 09:00 | dueDate < วันนี้ AND status ≠ SUBMITTED | ESCALATION | Staff + Team Lead |

**ข้อแตกต่างสำคัญ:**

1. **ล่วงหน้า 7 วัน** — ตรงกับ requirement
2. **D-1 ส่งเป็น ESCALATION** — แจ้งทั้ง staff และ team lead พร้อมกัน ไม่ใช่แค่ reminder ปกติ
3. มี **cron ที่ 3** สำหรับงาน overdue โดยเฉพาะ (ไม่ได้ระบุในเอกสาร SRS เลย)

**รูปแบบข้อความ: LINE Flex Message (ไม่ใช่ plain text)**

Cron notify ส่งเป็น **Flex Message bubble** — รวมทุกงานของ staff คนเดียวในรอบเดียวกันไว้ใน **1 ข้อความ/คน/รอบ** เพื่อประหยัด LINE quota (100 บริษัท = 10 ข้อความ ถ้ามี 10 staff ไม่ใช่ 100 ข้อความ)

| ประเภท | Header สี | รายละเอียด |
|---|---|---|
| REMINDER | น้ำเงินเข้ม `#1E3A5F` | แสดงรายการงานทั้งหมดที่ due ใน N วัน |
| ESCALATION | แดง `#C0392B` | แสดงรายการงานด่วน due date สีแดง |

Body แสดง: ชื่อภาษี + บริษัท + วันครบกำหนด สูงสุด 10 รายการ (มากกว่า → "และอีก N งาน...")

Manual notification จาก TaskDetailModal ยังคงส่งเป็น plain text ทีละ task (intentional)

### สถานะ: ✅ ตรงกันแล้ว

- D-7, D-1, Escalation ทำงานตรงกับ code และ SDD/SRS
- Flex Message batch — 1 ข้อความ/คน/รอบ

---

## 6. การจัดลำดับความเร่งด่วน (Priority)

### เอกสารปัจจุบันระบุว่า
> "คำนวณและจัดลำดับความเร่งด่วนของงานแต่ละรายการโดยอัตโนมัติ"

### ความจริงจาก `lib/repositories/tasks.ts`

- Task ทุกรายการถูกสร้างด้วย `priority: "MEDIUM"` และ `mddScore: 50` แบบ hardcode
- ยังไม่มี logic คำนวณ priority อัตโนมัติ
- การแสดงผลในหน้า task list เรียงตาม `dueDate ASC` เท่านั้น
- Field `priority` และ `mddScore` มีอยู่ใน schema และ UI รองรับการแสดงผล แต่ยังไม่ได้ถูกคำนวณ

### สิ่งที่ทีมเอกสารต้องตัดสินใจ
- **ตัวเลือก A:** แก้เอกสารให้ตรงจริง → "แสดงงานเรียงตามวันครบกำหนด (เร็วที่สุดขึ้นก่อน)"
- **ตัวเลือก B:** ถ้า requirement นี้ยังจำเป็น ต้องแจ้ง dev team ว่ายังไม่ได้ implement

---

## สรุปจุดที่ต้องตัดสินใจ (Decision Points)

| # | หัวข้อ | เดิม | ปัจจุบัน (code + server จริง) | สถานะ |
|---|---|---|---|---|
| 1 | Platform | Vercel | Self-hosted Docker Compose (192.168.2.75) | ✅ แก้เอกสารแล้ว |
| 2 | Cron Jobs | 1 job (01:00) | 4 jobs (01:00, 08:00×2, 09:00) | ✅ แก้เอกสารแล้ว |
| 3 | ตาราง DB | 6 ตาราง | 11 ตาราง | ✅ แก้เอกสารแล้ว |
| 4 | CalcMethod | "2 รูปแบบ" | 3 รูปแบบ | ✅ แก้เอกสารแล้ว |
| 5 | แจ้งเตือนล่วงหน้า | 5 วัน | **7 วัน** (เปลี่ยนแล้ว) | ✅ code + เอกสารตรงกัน |
| 6 | D-1 notification type | REMINDER | **ESCALATION** (แจ้ง staff + team lead) | ✅ แก้เอกสารแล้ว |
| 7 | Overdue cron | ไม่ได้ระบุ | escalation cron ทุก 09:00 UTC | ✅ แก้เอกสารแล้ว |
| 8 | Priority auto-calculate | ระบุว่ามี | hardcode MEDIUM / เรียงตาม dueDate | ⚠️ ยังไม่ได้ implement (backlog) |

---

*ตรวจสอบโดย: Claude Code — อ้างอิงจาก source code และ server จริง ณ วันที่ 2026-06-12*
