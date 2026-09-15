# MALI — Monthly Automation Line Intelligence

ระบบจัดการงานภาษีอัตโนมัติสำหรับสำนักงานบัญชี — ติดตามงานยื่นแบบภาษี คำนวณวันครบกำหนดตามกฎหมายแต่ละประเภท และแจ้งเตือนทีมงานผ่าน LINE

---

## Stack

| ส่วน | Technology |
|------|-----------|
| Framework | Next.js 14 App Router, TypeScript |
| UI | shadcn/ui (Radix UI + Tailwind CSS) |
| Auth | NextAuth.js v4 (CredentialsProvider + JWT) |
| Database | PostgreSQL 16, Prisma 7 (`@prisma/adapter-pg`) |
| Messaging | LINE Messaging API |
| File Storage | Vercel Blob (production) / local disk fallback (dev) |
| Testing | Vitest |
| Deployment | Docker Compose |

---

## โครงสร้างโปรเจกต์

```text
app/
  (auth)/            หน้า login
  (dashboard)/        หน้าใช้งานหลังล็อกอิน (clients, tasks, calendar, settings/*, ...)
  api/                 API routes — ดู endpoint สำคัญด้านล่าง
lib/
  repositories/        DB access layer แยกตาม model (clients, tasks, users, rules, holidays, ...)
  ruleEngine.ts         คำนวณวันครบกำหนดจากกฎภาษี — ดูหัวข้อ "Tax rule engine" ด้านล่างก่อนแก้
  taskGenerator.ts     สร้าง task อัตโนมัติ (cron + manual + backfill)
  cronNotify.ts        Build/ส่ง LINE Flex message สำหรับ cron แจ้งเตือน
  auth.ts               NextAuth config
prisma/
  schema.prisma         Schema หลัก
  migrations/           7 migrations ปัจจุบัน (`prisma migrate deploy` เท่านั้น — ห้าม `migrate dev` บน prod)
  seed-production.ts    Seed ครั้งแรก: admin user + tax rules + วันหยุดราชการ
scripts/
  cron-entrypoint.sh    Entry point ของ container cron (เขียน crontab ด้วย env var แล้ว exec crond)
docs/
  DEPLOYMENT.md          ขั้นตอน deploy/rollback เต็ม + ข้อมูลเข้าถึงเซิร์ฟเวอร์
  USER_GUIDE.md, SRS.md, SDD.md   เอกสารประกอบ
```

---

## Environment Variables

| ตัวแปร | จำเป็น | ใช้ทำอะไร |
|--------|--------|-----------|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `NEXTAUTH_URL` | ✅ | **ต้องตรงกับโดเมน/URL ที่ user เข้าจริง** — NextAuth v4 hardcode ค่านี้เป็น base ของ callback URL เสมอ ไม่ auto-detect จาก request ผิดค่านี้ = login วนกลับหน้า login แบบไม่มี error (เจอเคสจริงตอนสลับจาก ngrok → VPN IP) |
| `NEXTAUTH_SECRET` | ✅ | เข้ารหัส JWT session — สร้างด้วย `openssl rand -base64 32` |
| `CRON_SECRET` | ✅ | Auth header ที่ cron container ใช้เรียก `/api/cron/*` (`x-cron-secret` header หรือ `Authorization: Bearer`) |
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ (สำหรับแจ้งเตือน) | Push message ผ่าน LINE Messaging API |
| `LINE_CHANNEL_SECRET` | ✅ (สำหรับ webhook) | Verify HMAC-SHA256 signature ของ LINE webhook |
| `BLOB_READ_WRITE_TOKEN` | production เท่านั้น | Vercel Blob สำหรับอัปโหลดไฟล์แนบ — ไม่ตั้งจะ fallback ไป `public/uploads/` (local disk เท่านั้น ไม่เหมาะกับ multi-instance) |
| `GOOGLE_API_KEY` | ไม่บังคับ | Sync วันหยุดราชการจาก Google Calendar API (`/api/holidays/google`) — ไม่ตั้งจะได้ 503 เฉยๆ ไม่กระทบส่วนอื่น |

ดู `.env.example` สำหรับ template และ `docs/DEPLOYMENT.md` สำหรับค่าจริงที่ตั้งบนเซิร์ฟเวอร์

**คำเตือนเรื่อง `NEXTAUTH_URL`**: ถ้าเปลี่ยนช่องทางเข้าถึง (LAN ↔ VPN ↔ domain) ต้องแก้ค่านี้ + restart `mali-app` ทุกครั้ง ไม่งั้น login จะเงียบๆ ใช้ไม่ได้ ทางเลือกระยะยาวถ้าต้องรองรับหลายช่องทางพร้อมกันจริงจัง คือตั้ง `AUTH_TRUST_HOST=true` ให้ NextAuth อ่าน host จาก request header แทน (แลกกับความเสี่ยง host header injection ในทางทฤษฎี — ยอมรับได้สำหรับ internal tool แต่ควรรู้ไว้ก่อนเปิดใช้)

---

## Tax rule engine — จุดที่ต้องระวังเวลาแก้

`lib/ruleEngine.ts` คำนวณ due date จาก `TaxRule` แต่ละตัว (`calcMethod` + `referenceDate` + `offset`) เกณฑ์จริงเก็บใน DB (table `Rule`, แก้ได้ผ่านหน้า Settings → เกณฑ์ภาษี) ไม่ใช่จาก `TAX_RULE_LIST` ในโค้ดตรงๆ — `TAX_RULE_LIST` เป็นแค่ source-of-truth ตอน seed ครั้งแรก **หลัง deploy ควรตรวจสอบว่า DB กับโค้ดไม่เพี้ยนไปจากกัน** (เจอเคสจริงมาแล้วที่ record ใน DB ถูกแก้ผ่าน UI จนค่า `offset`/`taxForm` ไม่ตรงกับกฎหมาย โดยไม่มีใครสังเกต จนกว่าจะมีคนแจ้ง due date ผิด)

จุดที่ subtle ที่สุด: `referenceDate` มี 4 แบบ (`month_end`, `fiscal_year_end`, `agm_date`, `half_year_end`) — สองแบบหลังไม่ได้เป็นแค่ arithmetic ตรงไปตรงมา ต้อง**resolve base date จริงก่อน**ถึงจะเรียก `calculateDueDateByRule` ได้ถูก:

- `half_year_end` → คำนวณจาก `getHalfYearEndDate(fiscalYearEndDate)` (fye ลบ 6 เดือน) ก่อน แล้วค่อย apply offset ของ rule นั้น
- `agm_date` → ต้องคำนวณ due date ของ taxForm `"AGM"` ให้เสร็จก่อน (ผ่าน holiday adjustment แล้ว) แล้วใช้ผลลัพธ์นั้นเป็น base — ทำใน `lib/repositories/rules.ts::getDueDateByTaxTypeFromDb` ไม่ใช่ใน `ruleEngine.ts`

ถ้าจะเพิ่ม `referenceDate` แบบใหม่ ต้องแก้ทั้ง 6 จุด: `prisma/schema.prisma` (enum, ต้อง migration), `lib/ruleEngine.ts` (type + logic), `lib/rulePayload.ts` (zod schema), `types/index.ts`, `components/rules/RuleModal.tsx`, `components/rules/RuleTable.tsx`

`addMonths()` ใน `ruleEngine.ts` รองรับ offset ติดลบ (floored modulo, ไม่ใช่ JS `%` ตรงๆ) — เคยมีบั๊กตรงนี้ที่ทำให้ client ที่ fiscal year end ไม่ใช่วันสิ้นเดือนคำนวณผิดไปเต็มปี ก่อนแก้เพิ่ม test case ใน `ruleEngine.test.ts` ทุกครั้งที่แตะฟังก์ชันนี้

---

## Cron Jobs

Container `cron` (Alpine + busybox crond) เรียก endpoint พวกนี้ทุกวัน 08:00 น. (Asia/Bangkok) — ดู schedule จริงและ auth header ที่ `scripts/cron-entrypoint.sh`:

| Endpoint | งาน |
|----------|-----|
| `POST /api/cron/generate-tasks` | สร้าง task ใหม่สำหรับทุก client ที่ยังไม่มี task ในรอบปัจจุบัน (idempotent — ข้าม client+taxType+รอบที่มี task อยู่แล้ว) |
| `POST /api/cron/notify?type=d7` | แจ้งเตือนงานที่ครบกำหนดใน 7 วัน |
| `POST /api/cron/notify?type=d1` | แจ้งเตือนงานที่ครบกำหนดพรุ่งนี้ — ส่งถึง staff + team lead |
| `POST /api/cron/notify?type=escalation` | แจ้งเตือนงาน overdue ทั้งหมด |

ทุก endpoint auth ด้วย `CRON_SECRET` (`x-cron-secret` header หรือ `Authorization: Bearer <secret>`) — เรียกตรงจากนอกระบบได้เพื่อ debug/rerun แต่ต้องมี secret

**สร้าง task ย้อนหลัง** (เช่น client ใหม่เข้าระบบหลังเดือนที่ควรมี task ไปแล้ว) ทำผ่านหน้า `/clients` → ปุ่ม "สร้างงานอัตโนมัติ" ที่ client ยังไม่มี task เลย จะมีตัวเลือกเดือนเริ่มต้น ใช้ `lib/taskGenerator.ts::generateTasksForClient` กับ `backfillFrom` — จำกัดเฉพาะ client ที่ไม่มีประวัติ task เพื่อไม่ให้ชนกับ task ที่มีอยู่แล้ว

---

## Testing

```bash
npm run test          # vitest run — pure-function tests เท่านั้น ไม่แตะ DB จริง
npm run lint
npx tsc --noEmit
```

Test ที่มีอยู่: `ruleEngine`, `rulePayload`, `taskGenerator`, `taskFilters`, `lineWebhook`, `userManagement` — ไม่มี integration test ที่แตะ DB จริง (ไม่มี Prisma mock infra) ฟังก์ชันที่ต้องใช้ Prisma (repositories) ยังไม่มี automated test ให้ทดสอบผ่าน manual/dry-run ก่อน deploy จริงเสมอ

---

## Deploy / Rollback

ดูขั้นตอนเต็ม, ข้อมูลเข้าถึงเซิร์ฟเวอร์, และ credential ที่ [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

สรุปสั้น: `git pull` → `docker compose build app` → `docker compose up -d app` (migration รันอัตโนมัติใน `docker-entrypoint.sh` ตอน container start) มี backup script ก่อนแก้ข้อมูลสำคัญ — เก็บ dump ไว้ที่ `.deploy-backups/` บนเซิร์ฟเวอร์ก่อนทำ destructive operation ใดๆ (ลบ/regenerate ข้อมูลจำนวนมาก) เสมอ

---

## เอกสารเพิ่มเติม

| เอกสาร | เนื้อหา |
|--------|---------|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | ขั้นตอน deploy เต็ม + ข้อมูลเซิร์ฟเวอร์ |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | คู่มือผู้ใช้ปลายทาง |
| [docs/SRS.md](docs/SRS.md) / [docs/SDD.md](docs/SDD.md) | ข้อกำหนดและออกแบบระบบ |
| [docs/system-logic-review.md](docs/system-logic-review.md) | บันทึกทบทวน logic ที่เคยพบปัญหา |
