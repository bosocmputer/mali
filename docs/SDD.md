# Software Design Document (SDD)
## MALI — Monthly Automation Line Intelligence
### ระบบจัดการงานภาษีอัตโนมัติสำหรับสำนักงานบัญชี

---

**เวอร์ชัน:** 1.0  
**วันที่:** 22 พฤษภาคม 2569  
**สถานะ:** In Development  
**อ้างอิง:** SRS v2.0 (docs/SRS.md)

---

## สารบัญ

1. [บทนำ](#1-บทนำ)
2. [สถาปัตยกรรมระบบ (System Architecture)](#2-สถาปัตยกรรมระบบ)
3. [โครงสร้างโปรเจค (Project Structure)](#3-โครงสร้างโปรเจค)
4. [Layer Design](#4-layer-design)
5. [Database Design](#5-database-design)
6. [Authentication & Session Design](#6-authentication--session-design)
7. [Business Logic Design](#7-business-logic-design)
8. [API Design Patterns](#8-api-design-patterns)
9. [Frontend Component Design](#9-frontend-component-design)
10. [LINE Integration Design](#10-line-integration-design)
11. [Testing Design](#11-testing-design)
12. [Deployment Design](#12-deployment-design)

---

## 1. บทนำ

### 1.1 วัตถุประสงค์

เอกสาร SDD นี้อธิบายการออกแบบทางเทคนิคของระบบ MALI ครอบคลุม architecture, โครงสร้างโค้ด, database schema, data flow และการตัดสินใจออกแบบสำคัญ (design decisions)

### 1.2 ความสัมพันธ์กับ SRS

SDD เป็นเอกสาร "HOW" ที่ตอบสนองต่อ "WHAT" ใน SRS ทุก requirement ใน SRS ต้องสามารถ trace กลับมาหา design decision ใน SDD ได้

### 1.3 Design Principles

| หลักการ | การนำไปใช้ |
| ------- | --------- |
| **Separation of Concerns** | Pages / API Routes / Business Logic / Repository แยกชั้นชัดเจน |
| **Type Safety** | TypeScript strict — types กลางอยู่ใน `types/index.ts` |
| **UTC-first** | การคำนวณวันที่ทั้งหมดใช้ UTC เพื่อป้องกัน timezone drift |
| **Repository Pattern** | Database access ผ่าน `lib/repositories/` เท่านั้น |
| **Fail-safe** | LINE ไม่มี token → skip silently แทน throw error |
| **RBAC at API boundary** | ตรวจ role ทุก API route — ไม่ trust client-side |

---

## 2. สถาปัตยกรรมระบบ

### 2.1 Architectural Style

MALI ใช้ **Layered Architecture** บน Next.js 14 App Router โดยแบ่งเป็น 4 ชั้น:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Presentation                                   │
│  Next.js Pages (Server Components) + shadcn/ui          │
│  Client Components ('use client') + Recharts            │
├─────────────────────────────────────────────────────────┤
│  Layer 2: API / Application                             │
│  Next.js API Routes (/api/*)                            │
│  NextAuth.js v4 (JWT)                                   │
│  Zod Validation                                         │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Business Logic                                │
│  lib/ruleEngine.ts      — คำนวณ due date               │
│  lib/taskGenerator.ts   — สร้าง task batch              │
│  lib/userManagement.ts  — password utilities            │
│  lib/lineWebhook.ts     — LINE command parsing          │
│  lib/holidays.ts        — holiday-safe date shift       │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Data Access (Repository Pattern)              │
│  lib/repositories/      — Prisma queries                │
│  lib/db.ts              — PrismaClient singleton        │
│  lib/dbMappers.ts       — DB ↔ Domain type conversion   │
└─────────────────────────────────────────────────────────┘
                           │
                    PostgreSQL Database
```

### 2.2 Deployment Architecture

```
GitHub (main branch)
        │
        │ auto push
        ▼
  Vercel (Production)
  ┌───────────────────────────────────────────────────────┐
  │  Next.js App (Serverless Functions)                    │
  │  ┌───────────┐  ┌───────────┐  ┌───────────────────┐  │
  │  │  Pages    │  │  API      │  │  Cron Jobs        │  │
  │  │  (SSR)    │  │  Routes   │  │  (Vercel Cron)    │  │
  │  └───────────┘  └─────┬─────┘  └─────────┬─────────┘  │
  └────────────────────────┼──────────────────┼────────────┘
                           │                  │
              ┌────────────┘                  │
              ▼                               ▼
   PostgreSQL Database              POST /api/cron/generate-tasks
   (Supabase / Neon / Railway)      (with CRON_SECRET header)
```

### 2.3 External Service Integration

```
MALI System
    │
    ├─── LINE Platform ──────────────────────────────────────
    │    ├── PUSH: POST https://api.line.me/v2/bot/message/push
    │    │         (LINE_CHANNEL_ACCESS_TOKEN)
    │    ├── REPLY: POST https://api.line.me/v2/bot/message/reply
    │    │          (LINE_CHANNEL_ACCESS_TOKEN)
    │    └── WEBHOOK: POST /api/line/webhook ← LINE Platform
    │                 (verify HMAC-SHA256 signature)
    │
    └─── Google Calendar API (planned) ──────────────────────
         └── GET Thai holidays → POST /api/holidays/sync
```

---

## 3. โครงสร้างโปรเจค

```
mali/
├── app/
│   ├── (dashboard)/                  # Route group — ทุก page ต้อง auth
│   │   ├── dashboard/page.tsx        # Server Component
│   │   ├── tasks/page.tsx
│   │   ├── clients/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── guide/page.tsx
│   │   └── settings/
│   │       ├── holidays/page.tsx     # SUPERVISOR only
│   │       ├── rules/page.tsx        # SUPERVISOR only
│   │       ├── teams/page.tsx        # SUPERVISOR only
│   │       └── users/page.tsx        # SUPERVISOR only
│   ├── api/
│   │   ├── auth/[...nextauth]/       # NextAuth handler
│   │   ├── tasks/
│   │   │   ├── route.ts              # GET, POST
│   │   │   ├── [id]/route.ts         # GET, PATCH
│   │   │   ├── [id]/next-cycle/      # GET
│   │   │   └── preview-due/          # POST
│   │   ├── clients/
│   │   │   ├── route.ts              # GET, POST, PATCH, DELETE
│   │   │   └── [id]/generate-tasks/  # POST
│   │   ├── rules/route.ts
│   │   ├── holidays/
│   │   │   ├── route.ts
│   │   │   └── sync/route.ts
│   │   ├── teams/route.ts
│   │   ├── users/route.ts
│   │   ├── notifications/
│   │   │   ├── route.ts
│   │   │   └── send/route.ts
│   │   ├── profile/
│   │   │   ├── route.ts
│   │   │   └── line-link-token/route.ts
│   │   ├── line/webhook/route.ts
│   │   ├── cron/generate-tasks/route.ts
│   │   └── health/route.ts
│   ├── login/page.tsx                # Public
│   ├── layout.tsx                    # Root layout + ThemeProvider
│   ├── providers.tsx                 # SessionProvider + ThemeProvider
│   └── globals.css                   # CSS variables (light/dark)
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Navbar.tsx
│   ├── tasks/
│   │   ├── TaskTable.tsx             # 'use client'
│   │   ├── TaskDetailModal.tsx
│   │   ├── TaskStatusBadge.tsx
│   │   └── CreateTaskModal.tsx
│   ├── clients/
│   │   ├── ClientTable.tsx           # 'use client'
│   │   └── ClientModal.tsx
│   ├── users/
│   │   ├── UserTable.tsx             # 'use client'
│   │   └── UserModal.tsx
│   ├── teams/TeamModal.tsx
│   ├── rules/RuleModal.tsx
│   ├── calendar/TaxCalendar.tsx
│   ├── dashboard/
│   │   ├── PriorityChart.tsx
│   │   ├── WorkloadChart.tsx
│   │   ├── MonthProgressCard.tsx
│   │   └── UrgentTaskList.tsx
│   └── guide/GuideClient.tsx
│
├── lib/
│   ├── auth.ts                       # NextAuth authOptions
│   ├── db.ts                         # PrismaClient singleton
│   ├── dbMappers.ts                  # DB record → Domain type
│   ├── ruleEngine.ts                 # Due date calculation
│   ├── taskGenerator.ts              # Batch task generation
│   ├── taskGenerationUtils.ts        # Helpers (getNextFiscalYearEndDate)
│   ├── userManagement.ts             # Password generation/validation
│   ├── lineWebhook.ts                # LINE signature + command parsing
│   ├── holidays.ts                   # Holiday-safe date shift
│   ├── utils.ts                      # cn(), formatThaiDate(), etc.
│   ├── generated/prisma/             # Prisma generated client
│   └── repositories/
│       ├── tasks.ts
│       ├── clients.ts
│       ├── rules.ts
│       ├── holidays.ts
│       ├── teams.ts
│       ├── users.ts
│       ├── notifications.ts
│       └── lineLinks.ts
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   ├── migrations/                   # Migration history
│   │   ├── 20260520140333_init/
│   │   ├── 20260520150043_line_link_tokens/
│   │   ├── 20260520150530_unique_line_user_id/
│   │   ├── 20260520151933_task_generation_runs/
│   │   └── 20260521132900_user_management_is_active/
│   └── seed.ts                       # Initial data
│
├── types/index.ts                    # All domain types + NextAuth augmentation
├── data/mockData.ts                  # Legacy mock (ยังใช้อยู่บางส่วน)
├── docs/
│   ├── SRS.md
│   └── SDD.md
├── prisma.config.ts                  # Prisma config (reads .env.local)
├── vitest.config.ts                  # Unit test config
└── .env.example                      # Template ENV variables
```

---

## 4. Layer Design

### 4.1 Presentation Layer — Pages

**Design Decision: Server Components by Default**

ทุก page ใช้ `async` Server Component เพื่อ:
- Fetch ข้อมูลโดยตรง (ไม่ผ่าน client fetch)
- Zero JavaScript bundle สำหรับ initial render
- Session check ทำ server-side ก่อน render

```typescript
// ตัวอย่าง pattern ของทุก page
export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tasks = await findTasksFromDb({ ... }); // direct DB call

  return <TaskTable tasks={tasks} role={session.user.role} />;
}
```

**Design Decision: Client Components สำหรับ Interactivity**

Component ที่ต้องการ state, event handlers, หรือ browser APIs ใช้ `'use client'` และรับ initial data จาก Server Component ผ่าน props

Pattern การ update ข้อมูล:
```
User Action → fetch('/api/...') → router.refresh() → Server re-render
```

### 4.2 API Layer

**Design Decision: Consistent RBAC Pattern**

ทุก API route ใช้ pattern เดียวกัน:

```typescript
export async function POST(req: NextRequest) {
  // 1. ตรวจ session
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. ตรวจ role (ถ้า SUPERVISOR only)
  if (session.user.role !== "SUPERVISOR")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 3. Validate input ด้วย Zod
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "..." }, { status: 400 });

  // 4. Business logic / Repository call
  const result = await repository.create(parsed.data);

  return NextResponse.json({ data: result }, { status: 201 });
}
```

**Design Decision: Zod Validation ทุก API**

- ป้องกัน injection และ type mismatch
- Error message เป็นภาษาไทยสำหรับ user-facing
- Schema อยู่ใกล้ handler (ไม่แยกไฟล์) เพื่อ readability

### 4.3 Business Logic Layer

แยกจาก API layer เพื่อ:
- Testability — สามารถ unit test โดยไม่ต้อง mock HTTP
- Reusability — เรียกได้จากทั้ง API route และ cron job

| File | ความรับผิดชอบ |
| ---- | ------------ |
| `ruleEngine.ts` | คำนวณ due date จาก TaxRule + base date (UTC-safe) |
| `taskGenerator.ts` | Orchestrate การสร้าง task batch — หาลูกค้า, คำนวณ due date, insert DB |
| `taskGenerationUtils.ts` | `getNextFiscalYearEndDate()`, `buildGenerationMessage()` |
| `userManagement.ts` | `generateTemporaryPassword()`, `normalizeEmail()` |
| `lineWebhook.ts` | `verifyLineSignature()`, `parseLineTextCommand()`, `hashLineLinkToken()` |
| `holidays.ts` | Holiday-safe date shifting |

### 4.4 Repository Layer

**Design Decision: Repository Pattern**

ทุก database access ต้องผ่าน `lib/repositories/` เท่านั้น — ห้าม import `prisma` โดยตรงใน API route หรือ page

ประโยชน์:
- เปลี่ยน ORM ได้โดยไม่กระทบ layer บน
- ทดสอบ business logic โดย mock repository
- Query optimization รวมศูนย์

**Design Decision: dbMappers.ts**

Prisma return DB record types (มี `Date` object, `null` แทน `undefined`) — `dbMappers.ts` แปลงเป็น domain types ใน `types/index.ts` ก่อนส่งออกจาก repository

```
Prisma Record (DbTask) → toTask() → Task (domain type)
```

---

## 5. Database Design

### 5.1 Entity Relationship Diagram

```
User ──────────────────────────────────────────────────┐
  │                                                     │
  │ 1:N (ledTeams)    N:M (TeamMember)                  │
  │                        │                           │
  ▼                        ▼                           │
Team ◄──────────── TeamMember                          │
  │                                                    │
  │ 1:N                                                │
  ▼                                                    │
Client ──────────────────────────────────────────┐    │
  │                                              │    │
  │ 1:N                                          │    │
  ▼                                              ▼    ▼
TaxType                                         Task
  │                                              │
  │ (via Task)                                   │ 1:N
  └──────────────────────────────────────►  NotificationLog
                                                │
                                                │ N:1
                                                └──► User

Rule (standalone — lookup table)
ThaiHoliday (standalone — date skip list)
LineLinkToken ──► User (N:1)
TaskGenerationRun (audit log — standalone)
```

### 5.2 Table Descriptions

#### User
บัญชีผู้ใช้งานระบบ — ทั้ง SUPERVISOR และ STAFF

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| id | String PK | cuid() |
| name | String | ชื่อแสดงผล |
| email | String UNIQUE | ใช้ login |
| password | String | bcrypt hash |
| role | Enum(SUPERVISOR,STAFF) | กำหนดสิทธิ์ |
| isActive | Boolean DEFAULT true | false = ถูก deactivate |
| lineUserId | String? UNIQUE | ผูก LINE account |
| createdAt | DateTime | auto |

#### LineLinkToken
Token ชั่วคราวสำหรับผูก LINE account กับ User

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| id | String PK | |
| userId | String FK(User) | CASCADE delete |
| tokenHash | String UNIQUE | SHA-256 hash ของ token จริง |
| expiresAt | DateTime | +10 นาทีจากสร้าง |
| usedAt | DateTime? | null = ยังไม่ได้ใช้ |
| createdAt | DateTime | auto |

Index: `userId`, `expiresAt`

#### Team
กลุ่มทีมงานภายในสำนักงาน

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| id | String PK | |
| name | String | ชื่อทีม |
| leadUserId | String FK(User) | Restrict delete |
| createdAt | DateTime | auto |

#### TeamMember
Join table — สมาชิกทีม (many-to-many)

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| teamId | String FK(Team) | CASCADE delete |
| userId | String FK(User) | CASCADE delete |
| createdAt | DateTime | auto |

PK: `(teamId, userId)`

#### Client
ลูกค้านิติบุคคลของสำนักงานบัญชี

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| id | String PK | |
| companyName | String | ชื่อบริษัท |
| taxId | String? | เลขนิติบุคคล 13 หลัก |
| businessType | String | ประเภทธุรกิจ |
| fiscalYearStart | Int | 1–12 |
| fiscalYearEnd | Int | 1–12 |
| fiscalYearEndDay | Int | 1–31 |
| isNonStandard | Boolean DEFAULT false | FY ไม่ใช่ Jan–Dec |
| filingMethod | Enum? | PAPER หรือ E_FILING |
| assignedStaffId | String? FK(User) | SetNull on delete |
| teamId | String? FK(Team) | SetNull on delete |
| createdAt | DateTime | auto |

#### TaxType
ประเภทภาษีที่ลูกค้าต้องยื่น

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| id | String PK | |
| name | String | "ภ.ง.ด.50" เป็นต้น |
| frequency | Enum | MONTHLY / ANNUAL / ANNUAL_WORKFLOW |
| clientId | String FK(Client) | CASCADE delete |
| assignedStaffId | String? FK(User) | SetNull on delete |

Unique: `(clientId, name)` — ลูกค้าหนึ่งคนมี TaxType ชนิดเดียวกันได้แค่ครั้งเดียว

#### Rule
กฎคำนวณ due date — แก้ไขได้จากหน้า Settings

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| id | String PK | |
| ruleCode | String UNIQUE | "R-01" ถึง "R-15" |
| name | String | ชื่อกฎ |
| taxForm | String? | "ภ.ง.ด.50" |
| calcMethod | Enum | fixed_day / offset_days / offset_months |
| fixedDay | Int? | วันที่คงที่ (fixed_day method) |
| offset | Int? | จำนวนวัน/เดือน |
| referenceDate | Enum | month_end / fiscal_year_end / agm_date |
| legalRef | String | อ้างอิงกฎหมาย |

Index: `taxForm`

#### Task
งานยื่นแบบภาษีหนึ่งรายการ

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| id | String PK | |
| clientId | String FK(Client) | Restrict delete |
| taxTypeId | String FK(TaxType) | Restrict delete |
| assignedUserId | String FK(User) | Restrict delete |
| fiscalYearEndDate | DateTime | วันสิ้นรอบบัญชีที่ task นี้เป็นของ |
| dueDate | DateTime | วันครบกำหนด (คำนวณโดย ruleEngine) |
| ruleUsed | String? | ruleCode ที่ใช้คำนวณ |
| status | Enum DEFAULT TODO | TODO / PROCESSING / SUBMITTED |
| priority | Enum? | CRITICAL / HIGH / MEDIUM / LOW |
| mddScore | Float? | Modified Due Date Score |
| evidenceUrl | String? | URL หลักฐาน |
| note | String? | บันทึก |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto update |

Unique: `(clientId, taxTypeId, fiscalYearEndDate)` — ป้องกัน duplicate task  
Index: `assignedUserId`, `dueDate`, `status`

#### TaskGenerationRun
Audit log ทุกครั้งที่มีการ generate tasks

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| id | String PK | |
| scope | String | "all" หรือ clientId |
| clientId | String? | ถ้า scope เป็น client เดี่ยว |
| dryRun | Boolean DEFAULT false | |
| status | String | "completed" / "error" |
| created | Int DEFAULT 0 | จำนวน task ที่สร้าง |
| skipped | Int DEFAULT 0 | จำนวนที่ข้ามเพราะมีอยู่แล้ว |
| wouldCreate | Int DEFAULT 0 | จำนวนที่จะสร้าง (dry run) |
| errors | Json | รายการ error |
| triggeredBy | String? | "cron" หรือ userId |
| startedAt | DateTime | auto |
| completedAt | DateTime? | |

#### NotificationLog
ประวัติการส่งการแจ้งเตือน

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| id | String PK | |
| taskId | String FK(Task) | CASCADE delete |
| userId | String FK(User) | CASCADE delete |
| type | Enum | REMINDER / ESCALATION / MANUAL |
| sentAt | DateTime DEFAULT now | |

#### ThaiHoliday
วันหยุดราชการไทย — ใช้ในการ shift due date

| Column | Type | หมายเหตุ |
| ------ | ---- | -------- |
| id | String PK | |
| date | DateTime UNIQUE | Date only (db.Date) |
| nameTh | String | |
| nameEn | String | |
| type | Enum | public_holiday / special_holiday / government_holiday / substitution_holiday |
| isSubstitution | Boolean DEFAULT false | |
| note | String? | |

### 5.3 Migration History

| Migration | วันที่ | รายละเอียด |
| --------- | ----- | --------- |
| 20260520140333_init | 20 พ.ค. 69 | Schema เริ่มต้น — User, Client, TaxType, Rule, Task, NotificationLog, ThaiHoliday, Team |
| 20260520150043_line_link_tokens | 20 พ.ค. 69 | เพิ่ม LineLinkToken model |
| 20260520150530_unique_line_user_id | 20 พ.ค. 69 | เพิ่ม UNIQUE constraint บน User.lineUserId |
| 20260520151933_task_generation_runs | 20 พ.ค. 69 | เพิ่ม TaskGenerationRun model |
| 20260521132900_user_management_is_active | 21 พ.ค. 69 | เพิ่ม User.isActive field |

### 5.4 Prisma Configuration

```typescript
// prisma.config.ts — อ่าน .env.local (รองรับ local dev)
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DATABASE_URL") },
});
```

PrismaClient ใช้ `@prisma/adapter-pg` (PostgreSQL native adapter) และสร้างเป็น singleton เพื่อป้องกัน connection exhaustion ใน serverless:

```typescript
// lib/db.ts
const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? (() => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
})();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## 6. Authentication & Session Design

### 6.1 Authentication Flow

```
User กรอก email + password
          │
          ▼
POST /api/auth/signin (NextAuth CredentialsProvider)
          │
          ▼
getUserByEmailForAuth(email)  ← lib/repositories/users.ts
          │
          ├── user ไม่พบ → null (401)
          ├── isActive = false → null (401)
          ▼
bcrypt.compare(password, user.password)
          │
          ├── ไม่ตรง → null (401)
          ▼
สร้าง JWT Token { id, email, name, role }
          │
          ▼
Set-Cookie: next-auth.session-token (httpOnly, sameSite)
          │
          ▼
redirect → /dashboard
```

### 6.2 JWT Payload

```typescript
interface JWT {
  id: string         // user.id
  email: string
  name: string
  role: "SUPERVISOR" | "STAFF"
  // NextAuth standard fields:
  iat: number        // issued at
  exp: number        // expiry
  jti: string        // JWT ID
}
```

### 6.3 Session Update (Profile Name Change)

เมื่อผู้ใช้แก้ไขชื่อ → ต้องอัปเดต JWT token ด้วย:
```typescript
await update({ name: newName });  // NextAuth session update trigger
// jwt callback: if (trigger === "update" && session?.name) token.name = session.name
```

### 6.4 Route Protection Pattern

```typescript
// Server Component
const session = await getServerSession(authOptions);
if (!session) redirect("/login");
if (session.user.role !== "SUPERVISOR") redirect("/dashboard");

// API Route
const session = await getServerSession(authOptions);
if (!session) return 401;
if (session.user.role !== "SUPERVISOR") return 403;
```

---

## 7. Business Logic Design

### 7.1 Rule Engine (`lib/ruleEngine.ts`)

**Design Decision: UTC-only Arithmetic**

ทุก Date operation ใช้ UTC methods (`getUTCFullYear`, `Date.UTC(...)`) เพื่อป้องกัน DST และ timezone shift โดยเฉพาะเมื่อ deploy บน Vercel ที่อาจมี timezone ต่างกัน

**Core Functions:**

```
calculateDueDateByRule(rule, baseDate)
    │
    ├── calcMethod = "fixed_day"
    │       └── fixedDayOfNextMonth(base, fixedDay)
    │               → วันที่ fixedDay ของเดือนถัดจาก base
    │
    ├── calcMethod = "offset_days"
    │       └── calculateDueDate(base, offset)
    │               → base + offset วัน (UTC)
    │
    └── calcMethod = "offset_months"
            └── addMonths(base, offset)
                    → วันสุดท้ายของเดือน base + offset เดือน
```

**Holiday-Safe Shifting — 2 Implementations:**

ระบบมี 2 version ของ holiday shifting แยกกันตาม context:

```
1. adjustDueDate() — lib/holidays.ts (legacy / static)
   ใช้ใน: unit tests, context ที่ไม่มี DB
   เช็คเฉพาะ: weekend (UTC)
   ไม่เช็ค: ThaiHoliday ใน DB (isThaiHoliday() คืน false เสมอ)

2. adjustDueDateFromDb() — lib/repositories/holidays.ts (production)
   ใช้ใน: taskGenerator.ts, API routes
   เช็ค: weekend + ThaiHoliday จาก DB จริง
   → อ่าน holidays ที่ SUPERVISOR แก้ไขได้สะท้อนทันที
```

Flow (production):

```
due date (raw)
    │
    └── loop (adjustDueDateFromDb):
        ├── ถ้าวันเสาร์/อาทิตย์ (UTC) → +1 วัน
        ├── ถ้า date อยู่ใน ThaiHoliday table → +1 วัน
        └── ถ้าเป็นวันทำการ → หยุด → return
```

### 7.2 Task Generator (`lib/taskGenerator.ts`)

**Design Decision: Idempotent Generation**

Task generation ต้อง idempotent — เรียกซ้ำกี่ครั้งก็ได้ผลเดิม เพราะ Prisma unique constraint `(clientId, taxTypeId, fiscalYearEndDate)` จะทำให้ duplicate insert throw `P2002` ซึ่ง generator จะ catch และนับเป็น `skipped`

**Flow:**

```
generateAllTasks(options)
    │
    ├── getAllClientsFromDb()
    │
    └── forEach client:
        │
        ├── getNextFiscalYearEndDate(client, now)
        │       → คำนวณ FY end date รอบถัดไป
        │
        └── forEach taxType in client.taxTypes:
            │
            ├── getRuleByTaxFormFromDb(taxType.name)
            │       → ดึง rule จาก DB
            │
            ├── calculateDueDateByRule(rule, fyEndDate)
            │       → due date (raw)
            │
            ├── shiftIfHoliday(dueDate, holidays)
            │       → due date (holiday-safe)
            │
            └── prisma.task.create(...)
                    ├── success → created++
                    └── P2002 (unique) → skipped++
```

**Dry Run Mode:**

ถ้า `dryRun = true` → ข้าม `prisma.task.create` แต่นับ `wouldCreate` แทน ใช้ preview ก่อน run จริง

**TaskGenerationRun Logging:**

ทุก run (ไม่ว่า dryRun หรือไม่) บันทึก `TaskGenerationRun` ใน DB พร้อม: scope, created, skipped, errors, triggeredBy, startedAt, completedAt

### 7.3 User Management (`lib/userManagement.ts`)

**Temporary Password Generation:**

```
generateTemporaryPassword(length = 14)
    │
    ├── require: lowercase, uppercase, digit, symbol (1 ตัวขั้นต่ำ)
    ├── fill remaining: random chars จาก ALL_CHARS
    └── Fisher-Yates shuffle (crypto.randomInt)
    → password ที่ predictable strength แต่ไม่ predictable ตัวอักษร
```

ใช้ `node:crypto.randomInt` แทน `Math.random()` เพื่อ cryptographic randomness

### 7.4 LINE Webhook (`lib/lineWebhook.ts`)

**Signature Verification:**
```
HMAC-SHA256(rawBody, LINE_CHANNEL_SECRET) → base64
compare กับ x-line-signature header
```

**Token Hashing:**
```
SHA-256(token + ":" + NEXTAUTH_SECRET) → hex
เก็บเฉพาะ hash ใน DB — ไม่เก็บ plain token
```

---

## 8. API Design Patterns

### 8.1 Response Shape

ทุก API ใช้ shape เดียวกัน:

```typescript
// Success
{ "data": <result> }
{ "data": <result>, "message": "..." }

// Error
{ "error": "ข้อความภาษาไทยสำหรับ user" }
```

HTTP Status Codes:
| Code | ใช้เมื่อ |
| ---- | ------- |
| 200 | GET สำเร็จ, PATCH/DELETE สำเร็จ |
| 201 | POST สร้างสำเร็จ |
| 400 | Validation error (Zod fail) |
| 401 | ไม่มี session |
| 403 | มี session แต่ role ไม่มีสิทธิ์ |
| 404 | ไม่พบ resource |
| 409 | Conflict (เช่น email ซ้ำ) |
| 503 | Database down (health check) |

### 8.2 Error Classes (Repository Layer)

```typescript
// lib/repositories/users.ts
export class DuplicateUserEmailError extends Error {}
export class UserNotFoundError extends Error {}
```

API route catch specific error class แทน generic `Error` เพื่อให้ response ถูกต้อง

### 8.3 OVERDUE Virtual Filter

`OVERDUE` ไม่ใช่ enum ใน DB แต่เป็น virtual filter ใน `findTasksFromDb`:

```typescript
if (filters.status === "OVERDUE") {
  where.status = { not: "SUBMITTED" };   // TODO หรือ PROCESSING
  where.dueDate = { lt: new Date() };    // dueDate ผ่านมาแล้ว
}
```

### 8.4 Cron Endpoint Protection

```typescript
const CRON_SECRET = process.env.CRON_SECRET ?? "";

const auth = req.headers.get("x-cron-secret");
if (!CRON_SECRET || !auth || auth !== CRON_SECRET) {
  return 401;
}
```

ไม่ใช้ JWT เพราะ cron caller ไม่มี user session

---

## 9. Frontend Component Design

### 9.1 Component Hierarchy

```
app/layout.tsx (ThemeProvider + SessionProvider)
    │
    └── app/(dashboard)/layout.tsx
        ├── Sidebar.tsx (Server Component)
        └── Navbar.tsx  (Client Component — bell badge)
            │
            └── page.tsx (Server Component — data fetch)
                └── <FeatureTable> (Client Component — interaction)
                    └── <FeatureModal> (Client Component — dialog)
```

### 9.2 Data Flow Pattern

```
Server Component (page.tsx)
    │ fetch data โดยตรงจาก repository หรือ API
    │ ส่งผ่าน props
    ▼
Client Component (Table/Modal)
    │ user action → fetch('/api/...')
    │ await response
    ▼
router.refresh()
    │ Next.js re-run Server Component
    ▼
UI อัปเดตโดยไม่ต้อง full page reload
```

### 9.3 Theme System

```
next-themes ThemeProvider
    attribute="class"    → เพิ่ม/ลบ class "dark" บน <html>
    defaultTheme="system"
    enableSystem

tailwind.config.ts:
    darkMode: ["class"]  → ใช้ class strategy

CSS Variables (globals.css):
    :root { --background: ... }       ← light mode
    .dark { --background: ... }       ← dark mode
    (วางนอก @layer base เพื่อไม่ถูก Tailwind purge)
```

### 9.4 Form Validation

ทุก form ใน Client Component validate ทั้ง client-side (UI feedback) และ server-side (Zod ใน API) เป็น defense-in-depth

### 9.5 Modal Pattern

Modal ใช้ shadcn/ui `Dialog` (Radix UI) — controlled component ด้วย `open` / `onOpenChange` state ใน parent component

---

## 10. LINE Integration Design

### 10.1 Flow การส่งแจ้งเตือน (Push)

```
SUPERVISOR กด "ส่ง Reminder" ใน TaskDetailModal
          │
          ▼
POST /api/notifications/send { taskId, type }
          │
          ├── ดึง task + client + team จาก DB
          │
          ├── ตรวจ Escalation conditions:
          │     ├── type = "ESCALATION" → เพิ่ม team lead
          │     └── dueDate = พรุ่งนี้ + status ≠ SUBMITTED → เพิ่ม team lead
          │
          ├── forEach recipient:
          │     ├── createNotificationInDb(taskId, userId, type)
          │     └── ถ้า user.lineUserId มีค่า:
          │           └── sendLineMessage(lineUserId, message)
          │                 → POST https://api.line.me/v2/bot/message/push
          │                   (skip silently ถ้าไม่มี LINE_CHANNEL_ACCESS_TOKEN)
          │
          └── return { message, escalated, recipients }
```

**Message Template:**

```
REMINDER:   "📋 [MALI] แจ้งเตือนงานภาษี\n\nงาน: {taxType}\nบริษัท: {company}\nครบกำหนด: {date}"
ESCALATION: "🚨 [MALI] แจ้งเตือน Escalation\n\n... ⚠️ งานนี้ยังไม่เสร็จ..."
MANUAL:     "🔔 [MALI] แจ้งเตือนจากผู้จัดการ\n\n..."
```

### 10.2 Flow การผูก LINE Account (Link Token)

```
User กด "เชื่อม LINE" ใน Profile Page
          │
          ▼
POST /api/profile/line-link-token
          │
          ├── crypto.randomInt(100000, 1000000) → 6-digit token (plain)
          ├── hashLineLinkToken(token) → SHA-256 hash
          ├── transaction:
          │     ├── deleteMany token เก่าของ user นี้ที่ยังไม่ได้ใช้ (usedAt: null)
          │     └── create LineLinkToken { userId, tokenHash, expiresAt: +10m }
          └── return { token (plain 6 หลัก), expiresAt, instruction }
                       (plain token แสดงให้ user เห็นครั้งเดียว)
          │
          ▼
User ส่งข้อความ "MALI <token>" ใน LINE OA
          │
          ▼
LINE Platform → POST /api/line/webhook
          │
          ├── verifyLineSignature(body, LINE_CHANNEL_SECRET)
          ├── parseLineTextCommand(text) → { kind: "link", token }
          └── consumeLineLinkToken(token, lineUserId)
                ├── hash token → tokenHash
                ├── findFirst { tokenHash, usedAt: null, expiresAt > now }
                ├── ไม่พบ / หมดอายุ → reply "โค้ดไม่ถูกต้องหรือหมดอายุ"
                └── transaction (atomic):
                      ├── lineLinkToken.update { usedAt: now }
                      ├── user.updateMany { lineUserId: null }
                      │     WHERE lineUserId = lineUserId AND id ≠ linkToken.userId
                      │     (ถอด lineUserId ออกจาก user เดิมถ้ามีคนผูกไว้ก่อน)
                      └── user.update { lineUserId } → reply "เชื่อม LINE สำเร็จ"
```

### 10.3 Security Design ของ LINE

| จุด | Mechanism |
| --- | --------- |
| Webhook signature | HMAC-SHA256 ด้วย LINE_CHANNEL_SECRET |
| Link Token format | 6-digit number (cryptographic `randomInt`) |
| Link Token storage | SHA-256 hash เท่านั้น — ไม่เก็บ plain token |
| Token expiry | 10 นาทีหลังสร้าง |
| Token one-time use | `usedAt` timestamp ป้องกัน replay |
| Token dedup | สร้างใหม่จะลบ token เก่าที่ยังไม่ได้ใช้ของ user คนเดียวกัน |
| LINE account rebind | ถ้า lineUserId ผูกกับ user อื่นอยู่ → ถอดออกก่อนใน transaction เดียวกัน |
| Message push | Bearer token ใน Authorization header |

---

## 11. Testing Design

### 11.1 Test Stack

| Tool | ใช้สำหรับ |
| ---- | -------- |
| Vitest | Unit test runner |
| TypeScript | Type-checking |

```typescript
// vitest.config.ts
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } }
});
```

### 11.2 Unit Test Coverage

| File | Test File | สิ่งที่ทดสอบ |
| ---- | --------- | ----------- |
| `lib/lineWebhook.ts` | `lib/lineWebhook.test.ts` | signature verification, command parsing, token hashing |
| `lib/taskGenerator.ts` | `lib/taskGenerator.test.ts` | due date calculation, duplicate handling, dry run |
| `lib/userManagement.ts` | `lib/userManagement.test.ts` | password generation, email normalization |

### 11.3 Test Strategy

- **Unit tests:** Business logic ใน `lib/` — ไม่ต้อง mock HTTP, ไม่ต้องใช้ DB จริง
- **Integration tests:** ยังไม่มี (future work)
- **E2E tests:** ยังไม่มี (future work)

---

## 12. Deployment Design

### 12.1 Environment Configuration

| Variable | ใช้ใน | หมายเหตุ |
| -------- | ----- | -------- |
| `DATABASE_URL` | `lib/db.ts`, `prisma.config.ts` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | `lib/auth.ts`, `lib/lineWebhook.ts` | JWT signing + LINE token hash |
| `NEXTAUTH_URL` | NextAuth | Production domain URL |
| `LINE_CHANNEL_ACCESS_TOKEN` | `app/api/notifications/send`, `app/api/line/webhook` | ไม่มี → skip push silently |
| `LINE_CHANNEL_SECRET` | `app/api/line/webhook` | ไม่มี → webhook return 500 |
| `CRON_SECRET` | `app/api/cron/generate-tasks` | ไม่มี → endpoint ปฏิเสธทุก request |

### 12.2 Build & Deploy Flow

```
git push → main branch
          │
          ▼
Vercel (auto-deploy)
    ├── next build
    │     ├── TypeScript type-check
    │     ├── ESLint
    │     └── Bundle pages + API routes
    └── deploy to edge network
```

### 12.3 Database Deployment

```
ก่อน deploy production ครั้งแรก:
  prisma migrate deploy          ← apply migrations
  tsx prisma/seed.ts             ← seed ข้อมูลเริ่มต้น

ทุก deploy ที่มี schema เปลี่ยน:
  prisma migrate deploy          ← incremental migrations
```

### 12.4 Cron Job Setup (Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/generate-tasks",
      "schedule": "0 1 * * *"
    }
  ]
}
```

Vercel จะ POST ไปที่ endpoint พร้อม header `x-cron-secret` ทุกวันเวลา 01:00 UTC (08:00 ICT)

### 12.5 Deployment Checklist

```
[ ] ตั้งค่า DATABASE_URL ใน Vercel Environment Variables
[ ] ตั้งค่า NEXTAUTH_SECRET (openssl rand -base64 32)
[ ] ตั้งค่า NEXTAUTH_URL (https://<domain>)
[ ] รัน: prisma migrate deploy
[ ] รัน: tsx prisma/seed.ts
[ ] ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN
[ ] ตั้งค่า LINE_CHANNEL_SECRET
[ ] ตั้ง LINE Webhook URL: https://<domain>/api/line/webhook
[ ] ตั้งค่า CRON_SECRET และ vercel.json cron schedule
[ ] ทดสอบ GET /api/health → { ok: true, database: "ok" }
[ ] ทดสอบ POST /api/line/webhook (LINE Developers console)
```

---

*เอกสารนี้สะท้อนการออกแบบ ณ วันที่ 22 พฤษภาคม 2569*  
*SDD ต้องอัปเดตทุกครั้งที่มีการเปลี่ยน architecture, schema migration, หรือ external service ใหม่*
