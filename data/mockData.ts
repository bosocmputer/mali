import { User, Client, Rule, Task, NotificationLog } from "@/types";

// ─── Users ───────────────────────────────────────────────────────────────────
// Passwords stored as bcrypt hash of "password123"
export const MOCK_USERS: User[] = [
  {
    id: "user-1",
    name: "สมชาย ผู้จัดการ",
    email: "supervisor@mali.com",
    password: "$2b$12$Ur..EvRF4BfAAo2OzxOWiOKSBYHqakC0s.B7CTO/gO45fDzSFQT4K",
    role: "SUPERVISOR",
    lineUserId: "Uabc1234supervisor",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "user-2",
    name: "สมหญิง เจ้าหน้าที่",
    email: "staff1@mali.com",
    password: "$2b$12$Ur..EvRF4BfAAo2OzxOWiOKSBYHqakC0s.B7CTO/gO45fDzSFQT4K",
    role: "STAFF",
    lineUserId: "Uabc1234staff1",
    createdAt: "2024-01-02T00:00:00.000Z",
  },
  {
    id: "user-3",
    name: "วิชัย นักบัญชี",
    email: "staff2@mali.com",
    password: "$2b$12$Ur..EvRF4BfAAo2OzxOWiOKSBYHqakC0s.B7CTO/gO45fDzSFQT4K",
    role: "STAFF",
    lineUserId: "Uabc1234staff2",
    createdAt: "2024-01-03T00:00:00.000Z",
  },
];

// ─── Rules (15 รายการ ตรงตามตารางกฎ MALI) ────────────────────────────────────
export const MOCK_RULES: Rule[] = [
  // ก. ภาษีรายเดือน
  {
    id: "rule-1",
    ruleCode: "R-01",
    name: "หัก ณ ที่จ่าย (เงินเดือน)",
    description: "ยื่นภายในวันที่ 15 ของเดือนถัดไป",
    taxForm: "ภ.ง.ด.1",
    calcMethod: "fixed_day",
    fixedDay: 15,
    referenceDate: "month_end",
    legalRef: "ป.รัษฎากร ม.52, 59",
  },
  {
    id: "rule-2",
    ruleCode: "R-02",
    name: "หัก ณ ที่จ่าย (บุคคลธรรมดา)",
    description: "ยื่นภายในวันที่ 15 ของเดือนถัดไป",
    taxForm: "ภ.ง.ด.3",
    calcMethod: "fixed_day",
    fixedDay: 15,
    referenceDate: "month_end",
    legalRef: "ป.รัษฎากร ม.3 เตรส",
  },
  {
    id: "rule-3",
    ruleCode: "R-03",
    name: "หัก ณ ที่จ่าย (นิติบุคคล)",
    description: "ยื่นภายในวันที่ 15 ของเดือนถัดไป",
    taxForm: "ภ.ง.ด.53",
    calcMethod: "fixed_day",
    fixedDay: 15,
    referenceDate: "month_end",
    legalRef: "ป.รัษฎากร ม.3 เตรส",
  },
  {
    id: "rule-4",
    ruleCode: "R-04",
    name: "VAT ปกติ",
    description: "ยื่นภายในวันที่ 23 ของเดือนถัดไป",
    taxForm: "ภ.พ.30",
    calcMethod: "fixed_day",
    fixedDay: 23,
    referenceDate: "month_end",
    legalRef: "ป.รัษฎากร ม.83",
  },
  {
    id: "rule-5",
    ruleCode: "R-05",
    name: "VAT ต่างประเทศ",
    description: "ยื่นภายในวันที่ 15 ของเดือนถัดไป",
    taxForm: "ภ.พ.36",
    calcMethod: "fixed_day",
    fixedDay: 15,
    referenceDate: "month_end",
    legalRef: "ป.รัษฎากร ม.83/6",
  },
  {
    id: "rule-6",
    ruleCode: "R-06",
    name: "ประกันสังคม",
    description: "นำส่งภายในวันที่ 23 ของเดือนถัดไป",
    taxForm: "ประกันสังคม",
    calcMethod: "fixed_day",
    fixedDay: 23,
    referenceDate: "month_end",
    legalRef: "พ.ร.บ.ประกันสังคม ม.47",
  },
  // ข. ภาษีรายปีและงานประจำปี
  {
    id: "rule-7",
    ruleCode: "R-07",
    name: "ประชุมผู้ถือหุ้น (AGM)",
    description: "จัดประชุมภายใน 4 เดือนหลังสิ้นรอบบัญชี",
    taxForm: "AGM",
    calcMethod: "offset_months",
    offset: 4,
    referenceDate: "fiscal_year_end",
    legalRef: "ป.พ.พ. ม.1172",
  },
  {
    id: "rule-8",
    ruleCode: "R-08",
    name: "ยื่นงบการเงิน (DBD)",
    description: "ยื่นภายใน 5 เดือนหลังสิ้นรอบบัญชี",
    taxForm: "ส.บช.3",
    calcMethod: "offset_months",
    offset: 5,
    referenceDate: "fiscal_year_end",
    legalRef: "พ.ร.บ.การบัญชี ม.11",
  },
  {
    id: "rule-9",
    ruleCode: "R-09",
    name: "ภาษีเงินได้นิติบุคคล",
    description: "ยื่นภายใน 150 วันหลังสิ้นรอบบัญชี",
    taxForm: "ภ.ง.ด.50",
    calcMethod: "offset_days",
    offset: 150,
    referenceDate: "fiscal_year_end",
    legalRef: "ป.รัษฎากร ม.68, 69",
  },
  {
    id: "rule-10",
    ruleCode: "R-10",
    name: "รายชื่อผู้ถือหุ้น (บอจ.5)",
    description: "ยื่นภายใน 14 วันหลัง AGM",
    taxForm: "บอจ.5",
    calcMethod: "offset_days",
    offset: 14,
    referenceDate: "agm_date",
    legalRef: "ป.พ.พ. ม.1139",
  },
  // ค. งบการเงินประจำปี workflow
  {
    id: "rule-11",
    ruleCode: "R-11",
    name: "จัดทำงบการเงิน (ร่าง)",
    description: "ร่างงบควรเสร็จภายใน 2 เดือนหลังสิ้นรอบ",
    taxForm: "จัดทำงบ (ร่าง)",
    calcMethod: "offset_months",
    offset: 2,
    referenceDate: "fiscal_year_end",
    legalRef: "พ.ร.บ.การบัญชี ม.11",
  },
  {
    id: "rule-12",
    ruleCode: "R-12",
    name: "ผู้สอบบัญชีรับรองงบ",
    description: "ผู้สอบบัญชีต้องรับรองภายใน 3 เดือน",
    taxForm: "ผู้สอบบัญชี",
    calcMethod: "offset_months",
    offset: 3,
    referenceDate: "fiscal_year_end",
    legalRef: "พ.ร.บ.วิชาชีพบัญชี ม.40",
  },
  {
    id: "rule-13",
    ruleCode: "R-13",
    name: "อนุมัติงบในที่ประชุม AGM",
    description: "ต้องอนุมัติงบในที่ประชุมภายใน 4 เดือน",
    taxForm: "AGM",
    calcMethod: "offset_months",
    offset: 4,
    referenceDate: "fiscal_year_end",
    legalRef: "ป.พ.พ. ม.1172",
  },
  {
    id: "rule-14",
    ruleCode: "R-14",
    name: "นำส่งงบการเงิน (DBD)",
    description: "นำส่งงบต่อกรมพัฒนาธุรกิจการค้าภายใน 5 เดือน",
    taxForm: "ส.บช.3",
    calcMethod: "offset_months",
    offset: 5,
    referenceDate: "fiscal_year_end",
    legalRef: "พ.ร.บ.การบัญชี ม.11",
  },
  {
    id: "rule-15",
    ruleCode: "R-15",
    name: "ภ.ง.ด.51 กึ่งปี",
    description: "ยื่นภายใน 60 วันหลังครบ 6 เดือนแรกของรอบบัญชี",
    taxForm: "ภ.ง.ด.51",
    calcMethod: "offset_days",
    offset: 60,
    referenceDate: "fiscal_year_end",
    legalRef: "ป.รัษฎากร ม.67 ทวิ",
  },
];

// ─── Clients (10 บริษัท) ──────────────────────────────────────────────────────
export const MOCK_CLIENTS: Client[] = [
  {
    id: "client-1",
    companyName: "บริษัท เอบีซี เทรดดิ้ง จำกัด",
    taxId: "0105567012345",
    businessType: "การค้า",
    fiscalYearStart: 1,
    fiscalYearEnd: 12,
    isNonStandard: false,
    filingMethod: "E_FILING",
    assignedStaffId: "user-2",
    taxTypes: [
      { id: "tt-1", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-1" },
      { id: "tt-2", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-1" },
      { id: "tt-3", name: "ภ.ง.ด.1", frequency: "MONTHLY", clientId: "client-1" },
    ],
    createdAt: "2024-01-10T00:00:00.000Z",
  },
  {
    id: "client-2",
    companyName: "ห้างหุ้นส่วนจำกัด ดีเอ็กซ์วาย อินดัสตรี",
    taxId: "0103556023456",
    businessType: "อุตสาหกรรม",
    fiscalYearStart: 4,
    fiscalYearEnd: 3,
    isNonStandard: true,
    filingMethod: "PAPER",
    assignedStaffId: "user-2",
    taxTypes: [
      { id: "tt-4", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-2" },
      { id: "tt-5", name: "ภ.ง.ด.51", frequency: "ANNUAL", clientId: "client-2" },
      { id: "tt-6", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-2" },
    ],
    createdAt: "2024-02-01T00:00:00.000Z",
  },
  {
    id: "client-3",
    companyName: "บริษัท กรีนเทค โซลูชั่น จำกัด",
    taxId: "0105568034567",
    businessType: "เทคโนโลยี",
    fiscalYearStart: 7,
    fiscalYearEnd: 6,
    isNonStandard: true,
    filingMethod: "E_FILING",
    assignedStaffId: "user-3",
    taxTypes: [
      { id: "tt-7", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-3" },
      { id: "tt-8", name: "ภ.ง.ด.1", frequency: "MONTHLY", clientId: "client-3" },
      { id: "tt-9", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-3" },
    ],
    createdAt: "2024-02-15T00:00:00.000Z",
  },
  {
    id: "client-4",
    companyName: "บริษัท สยามโลจิสติกส์ จำกัด (มหาชน)",
    taxId: "0107557045678",
    businessType: "โลจิสติกส์",
    fiscalYearStart: 1,
    fiscalYearEnd: 12,
    isNonStandard: false,
    filingMethod: "E_FILING",
    assignedStaffId: "user-3",
    taxTypes: [
      { id: "tt-10", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-4" },
      { id: "tt-11", name: "ภ.ง.ด.3", frequency: "MONTHLY", clientId: "client-4" },
    ],
    createdAt: "2024-03-01T00:00:00.000Z",
  },
  {
    id: "client-5",
    companyName: "ห้างหุ้นส่วนจำกัด ไทยฟู้ดส์",
    taxId: "0103559056789",
    businessType: "อาหารและเครื่องดื่ม",
    fiscalYearStart: 10,
    fiscalYearEnd: 9,
    isNonStandard: true,
    filingMethod: "PAPER",
    assignedStaffId: "user-2",
    taxTypes: [
      { id: "tt-12", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-5" },
      { id: "tt-13", name: "ภ.ง.ด.51", frequency: "ANNUAL", clientId: "client-5" },
      { id: "tt-14", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-5" },
    ],
    createdAt: "2024-03-10T00:00:00.000Z",
  },
  {
    id: "client-6",
    companyName: "บริษัท พรีเมียม เรียลเอสเตท จำกัด",
    taxId: "0105561067890",
    businessType: "อสังหาริมทรัพย์",
    fiscalYearStart: 1,
    fiscalYearEnd: 12,
    isNonStandard: false,
    filingMethod: "E_FILING",
    assignedStaffId: "user-2",
    taxTypes: [
      { id: "tt-15", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-6" },
      { id: "tt-16", name: "ภ.ง.ด.51", frequency: "ANNUAL", clientId: "client-6" },
      { id: "tt-17", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-6" },
      { id: "tt-18", name: "ภ.ง.ด.3", frequency: "MONTHLY", clientId: "client-6" },
    ],
    createdAt: "2024-04-01T00:00:00.000Z",
  },
  {
    id: "client-7",
    companyName: "บริษัท เอเชีย เมดิคอล ซัพพลาย จำกัด",
    taxId: "0105562078901",
    businessType: "บริการ",
    fiscalYearStart: 1,
    fiscalYearEnd: 12,
    isNonStandard: false,
    filingMethod: "E_FILING",
    assignedStaffId: "user-3",
    taxTypes: [
      { id: "tt-19", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-7" },
      { id: "tt-20", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-7" },
      { id: "tt-21", name: "ภ.ง.ด.1", frequency: "MONTHLY", clientId: "client-7" },
    ],
    createdAt: "2024-05-15T00:00:00.000Z",
  },
  {
    id: "client-8",
    companyName: "ห้างหุ้นส่วนจำกัด นอร์ธ อะกริ ฟาร์ม",
    taxId: "0103563089012",
    businessType: "เกษตรกรรม",
    fiscalYearStart: 4,
    fiscalYearEnd: 3,
    isNonStandard: true,
    filingMethod: "PAPER",
    assignedStaffId: "user-2",
    taxTypes: [
      { id: "tt-22", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-8" },
      { id: "tt-23", name: "ภ.ง.ด.3", frequency: "MONTHLY", clientId: "client-8" },
    ],
    createdAt: "2024-06-01T00:00:00.000Z",
  },
  {
    id: "client-9",
    companyName: "บริษัท ไทยไฟแนนซ์ แอนด์ แคปิทัล จำกัด",
    taxId: "0105564090123",
    businessType: "การเงินและการธนาคาร",
    fiscalYearStart: 1,
    fiscalYearEnd: 12,
    isNonStandard: false,
    filingMethod: "E_FILING",
    assignedStaffId: "user-3",
    taxTypes: [
      { id: "tt-24", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-9" },
      { id: "tt-25", name: "ภ.ง.ด.51", frequency: "ANNUAL", clientId: "client-9" },
      { id: "tt-26", name: "ภ.ง.ด.1", frequency: "MONTHLY", clientId: "client-9" },
      { id: "tt-27", name: "ภ.ง.ด.3", frequency: "MONTHLY", clientId: "client-9" },
    ],
    createdAt: "2024-07-10T00:00:00.000Z",
  },
  {
    id: "client-10",
    companyName: "บริษัท สมาร์ท รีเทล กรุ๊ป จำกัด",
    taxId: "0105565101234",
    businessType: "การค้า",
    fiscalYearStart: 7,
    fiscalYearEnd: 6,
    isNonStandard: true,
    filingMethod: "E_FILING",
    assignedStaffId: "user-2",
    taxTypes: [
      { id: "tt-28", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-10" },
      { id: "tt-29", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-10" },
      { id: "tt-30", name: "ภ.ง.ด.1", frequency: "MONTHLY", clientId: "client-10" },
    ],
    createdAt: "2024-08-01T00:00:00.000Z",
  },
];

// ─── Shorthand refs ───────────────────────────────────────────────────────────
const u2 = MOCK_USERS[1];
const u3 = MOCK_USERS[2];
const c1 = MOCK_CLIENTS[0];
const c2 = MOCK_CLIENTS[1];
const c3 = MOCK_CLIENTS[2];
const c4 = MOCK_CLIENTS[3];
const c5 = MOCK_CLIENTS[4];
const c6 = MOCK_CLIENTS[5];
const c7 = MOCK_CLIENTS[6];
const c8 = MOCK_CLIENTS[7];
const c9 = MOCK_CLIENTS[8];
const c10 = MOCK_CLIENTS[9];

// ─── Tasks (30 tasks — ครอบปี 2026 ทุก status) ───────────────────────────────
export const MOCK_TASKS: Task[] = [
  // ── OVERDUE (เกินกำหนดแล้ว) ──────────────────────────────────────────────
  {
    id: "task-1",
    clientId: "client-4",
    client: c4,
    taxTypeId: "tt-11",
    taxType: c4.taxTypes[1], // ภ.ง.ด.3
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2026-02-28T00:00:00.000Z",
    // R-02: fixed day 15 of next month → 2026-03-15 (now overdue)
    dueDate: "2026-03-15T00:00:00.000Z",
    ruleUsed: "R-02: ภ.ง.ด.3 — วันที่ 15 เดือนถัดไป",
    status: "TODO",
    priority: "CRITICAL",
    mddScore: 98.5,
    note: "เกินกำหนดแล้ว รอเอกสารจากลูกค้า",
    createdAt: "2026-02-15T00:00:00.000Z",
    updatedAt: "2026-02-15T00:00:00.000Z",
  },
  {
    id: "task-2",
    clientId: "client-9",
    client: c9,
    taxTypeId: "tt-26",
    taxType: c9.taxTypes[2], // ภ.ง.ด.1
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2026-02-28T00:00:00.000Z",
    // R-01: fixed day 15 of next month → 2026-03-15 (now overdue)
    dueDate: "2026-03-15T00:00:00.000Z",
    ruleUsed: "R-01: ภ.ง.ด.1 — วันที่ 15 เดือนถัดไป",
    status: "PROCESSING",
    priority: "CRITICAL",
    mddScore: 97.2,
    note: "กำลังรวบรวมข้อมูลพนักงาน ยังไม่สมบูรณ์",
    createdAt: "2026-02-15T00:00:00.000Z",
    updatedAt: "2026-03-05T00:00:00.000Z",
  },
  {
    id: "task-3",
    clientId: "client-1",
    client: c1,
    taxTypeId: "tt-3",
    taxType: c1.taxTypes[2], // ภ.ง.ด.1
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-02-28T00:00:00.000Z",
    // R-01: fixed day 15 of next month → 2026-03-15 (now overdue)
    dueDate: "2026-03-15T00:00:00.000Z",
    ruleUsed: "R-01: ภ.ง.ด.1 — วันที่ 15 เดือนถัดไป",
    status: "TODO",
    priority: "CRITICAL",
    mddScore: 96.0,
    createdAt: "2026-02-20T00:00:00.000Z",
    updatedAt: "2026-02-20T00:00:00.000Z",
  },

  // ── TODO — ครบกำหนดเร็วๆ นี้ ──────────────────────────────────────────────
  {
    id: "task-4",
    clientId: "client-2",
    client: c2,
    taxTypeId: "tt-6",
    taxType: c2.taxTypes[2], // ภ.พ.30
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    // R-04: fixed day 23 of next month → 2026-04-23
    dueDate: "2026-04-23T00:00:00.000Z",
    ruleUsed: "R-04: ภ.พ.30 — วันที่ 23 เดือนถัดไป",
    status: "TODO",
    priority: "HIGH",
    mddScore: 85.3,
    createdAt: "2026-03-15T00:00:00.000Z",
    updatedAt: "2026-03-15T00:00:00.000Z",
  },
  {
    id: "task-5",
    clientId: "client-5",
    client: c5,
    taxTypeId: "tt-14",
    taxType: c5.taxTypes[2], // ภ.พ.30
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    // R-04: fixed day 23 of next month → 2026-04-23
    dueDate: "2026-04-23T00:00:00.000Z",
    ruleUsed: "R-04: ภ.พ.30 — วันที่ 23 เดือนถัดไป",
    status: "TODO",
    priority: "HIGH",
    mddScore: 84.1,
    createdAt: "2026-03-15T00:00:00.000Z",
    updatedAt: "2026-03-15T00:00:00.000Z",
  },
  {
    id: "task-6",
    clientId: "client-6",
    client: c6,
    taxTypeId: "tt-17",
    taxType: c6.taxTypes[2], // ภ.พ.30
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    // R-04: fixed day 23 of next month → 2026-04-23
    dueDate: "2026-04-23T00:00:00.000Z",
    ruleUsed: "R-04: ภ.พ.30 — วันที่ 23 เดือนถัดไป",
    status: "PROCESSING",
    priority: "HIGH",
    mddScore: 82.0,
    note: "รวบรวมใบกำกับภาษีแล้ว กำลังตรวจสอบ",
    createdAt: "2026-03-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
  },
  {
    id: "task-7",
    clientId: "client-7",
    client: c7,
    taxTypeId: "tt-21",
    taxType: c7.taxTypes[2], // ภ.ง.ด.1
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    // R-01: fixed day 15 of next month → 2026-04-15
    dueDate: "2026-04-15T00:00:00.000Z",
    ruleUsed: "R-01: ภ.ง.ด.1 — วันที่ 15 เดือนถัดไป",
    status: "TODO",
    priority: "HIGH",
    mddScore: 88.7,
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
  },
  {
    id: "task-8",
    clientId: "client-9",
    client: c9,
    taxTypeId: "tt-27",
    taxType: c9.taxTypes[3], // ภ.ง.ด.3
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    // R-02: fixed day 15 of next month → 2026-04-15
    dueDate: "2026-04-15T00:00:00.000Z",
    ruleUsed: "R-02: ภ.ง.ด.3 — วันที่ 15 เดือนถัดไป",
    status: "TODO",
    priority: "HIGH",
    mddScore: 87.5,
    createdAt: "2026-03-25T00:00:00.000Z",
    updatedAt: "2026-03-25T00:00:00.000Z",
  },

  // ── PROCESSING ──────────────────────────────────────────────────────────────
  {
    id: "task-9",
    clientId: "client-1",
    client: c1,
    taxTypeId: "tt-1",
    taxType: c1.taxTypes[0], // ภ.ง.ด.50
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2025-12-31T00:00:00.000Z",
    dueDate: "2026-05-30T00:00:00.000Z",
    ruleUsed: "R-09: ภ.ง.ด.50 — +150 วันหลังสิ้นรอบบัญชี",
    status: "PROCESSING",
    priority: "MEDIUM",
    mddScore: 62.4,
    note: "รับงบการเงินจากผู้สอบบัญชีแล้ว กำลังจัดทำ",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "task-10",
    clientId: "client-4",
    client: c4,
    taxTypeId: "tt-10",
    taxType: c4.taxTypes[0], // ภ.ง.ด.50
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2025-12-31T00:00:00.000Z",
    dueDate: "2026-05-30T00:00:00.000Z",
    ruleUsed: "R-09: ภ.ง.ด.50 — +150 วันหลังสิ้นรอบบัญชี",
    status: "PROCESSING",
    priority: "MEDIUM",
    mddScore: 60.1,
    note: "รอผู้สอบบัญชีเซ็นรับรองงบ",
    createdAt: "2026-01-08T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
  },
  {
    id: "task-11",
    clientId: "client-6",
    client: c6,
    taxTypeId: "tt-15",
    taxType: c6.taxTypes[0], // ภ.ง.ด.50
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2025-12-31T00:00:00.000Z",
    dueDate: "2026-05-30T00:00:00.000Z",
    ruleUsed: "R-09: ภ.ง.ด.50 — +150 วันหลังสิ้นรอบบัญชี",
    status: "PROCESSING",
    priority: "MEDIUM",
    mddScore: 58.9,
    note: "อยู่ระหว่างตรวจสอบรายการขายอสังหาฯ",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-04-08T00:00:00.000Z",
  },
  {
    id: "task-12",
    clientId: "client-7",
    client: c7,
    taxTypeId: "tt-19",
    taxType: c7.taxTypes[0], // ภ.ง.ด.50
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2025-12-31T00:00:00.000Z",
    dueDate: "2026-05-30T00:00:00.000Z",
    ruleUsed: "R-09: ภ.ง.ด.50 — +150 วันหลังสิ้นรอบบัญชี",
    status: "PROCESSING",
    priority: "MEDIUM",
    mddScore: 57.3,
    note: "ตรวจสอบค่าใช้จ่ายสำรองพยาบาล",
    createdAt: "2026-01-12T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
  },
  {
    id: "task-13",
    clientId: "client-9",
    client: c9,
    taxTypeId: "tt-24",
    taxType: c9.taxTypes[0], // ภ.ง.ด.50
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2025-12-31T00:00:00.000Z",
    dueDate: "2026-05-30T00:00:00.000Z",
    ruleUsed: "R-09: ภ.ง.ด.50 — +150 วันหลังสิ้นรอบบัญชี",
    status: "PROCESSING",
    priority: "MEDIUM",
    mddScore: 56.0,
    note: "กิจการเงินมีรายการซับซ้อน รอ CFO อนุมัติ",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-04-12T00:00:00.000Z",
  },

  // ── TODO — กลางปี 2026 ──────────────────────────────────────────────────────
  {
    id: "task-14",
    clientId: "client-9",
    client: c9,
    taxTypeId: "tt-25",
    taxType: c9.taxTypes[1], // ภ.ง.ด.51
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2026-06-30T00:00:00.000Z",
    dueDate: "2026-08-29T00:00:00.000Z",
    ruleUsed: "R-15: ภ.ง.ด.51 — +60 วันหลังครบ 6 เดือน",
    status: "TODO",
    priority: "MEDIUM",
    mddScore: 45.0,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "task-15",
    clientId: "client-6",
    client: c6,
    taxTypeId: "tt-16",
    taxType: c6.taxTypes[1], // ภ.ง.ด.51
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-06-30T00:00:00.000Z",
    dueDate: "2026-08-29T00:00:00.000Z",
    ruleUsed: "R-15: ภ.ง.ด.51 — +60 วันหลังครบ 6 เดือน",
    status: "TODO",
    priority: "MEDIUM",
    mddScore: 43.5,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "task-16",
    clientId: "client-10",
    client: c10,
    taxTypeId: "tt-28",
    taxType: c10.taxTypes[0], // ภ.ง.ด.50 (FY Jul–Jun)
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2025-06-30T00:00:00.000Z",
    dueDate: "2025-11-27T00:00:00.000Z",
    ruleUsed: "R-09: ภ.ง.ด.50 — +150 วันหลังสิ้นรอบบัญชี",
    status: "TODO",
    priority: "LOW",
    mddScore: 30.0,
    createdAt: "2025-07-01T00:00:00.000Z",
    updatedAt: "2025-07-01T00:00:00.000Z",
  },
  {
    id: "task-17",
    clientId: "client-3",
    client: c3,
    taxTypeId: "tt-7",
    taxType: c3.taxTypes[0], // ภ.ง.ด.50 (FY Jul–Jun)
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2025-06-30T00:00:00.000Z",
    dueDate: "2025-11-27T00:00:00.000Z",
    ruleUsed: "R-09: ภ.ง.ด.50 — +150 วันหลังสิ้นรอบบัญชี",
    status: "TODO",
    priority: "LOW",
    mddScore: 28.5,
    createdAt: "2025-07-01T00:00:00.000Z",
    updatedAt: "2025-07-01T00:00:00.000Z",
  },
  {
    id: "task-18",
    clientId: "client-8",
    client: c8,
    taxTypeId: "tt-22",
    taxType: c8.taxTypes[0], // ภ.ง.ด.50 (FY Apr–Mar)
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    dueDate: "2026-08-28T00:00:00.000Z",
    ruleUsed: "R-09: ภ.ง.ด.50 — +150 วันหลังสิ้นรอบบัญชี",
    status: "TODO",
    priority: "MEDIUM",
    mddScore: 42.0,
    createdAt: "2026-04-05T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
  },
  {
    id: "task-19",
    clientId: "client-2",
    client: c2,
    taxTypeId: "tt-4",
    taxType: c2.taxTypes[0], // ภ.ง.ด.50 (FY Apr–Mar)
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    dueDate: "2026-08-28T00:00:00.000Z",
    ruleUsed: "R-09: ภ.ง.ด.50 — +150 วันหลังสิ้นรอบบัญชี",
    status: "TODO",
    priority: "MEDIUM",
    mddScore: 41.0,
    createdAt: "2026-04-05T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
  },

  // ── SUBMITTED — เดือนก่อนๆ ─────────────────────────────────────────────────
  {
    id: "task-20",
    clientId: "client-1",
    client: c1,
    taxTypeId: "tt-2",
    taxType: c1.taxTypes[1], // ภ.พ.30
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    // R-04: fixed day 23 → 2026-04-23
    dueDate: "2026-04-23T00:00:00.000Z",
    ruleUsed: "R-04: ภ.พ.30 — วันที่ 23 เดือนถัดไป",
    status: "SUBMITTED",
    priority: "LOW",
    mddScore: 0,
    evidenceUrl: "https://storage.mali.app/evidence/task-20-vat-mar2026.pdf",
    note: "ยื่น e-Filing เรียบร้อย ชำระผ่าน KTB Netbank",
    createdAt: "2026-03-15T00:00:00.000Z",
    updatedAt: "2026-04-14T00:00:00.000Z",
  },
  {
    id: "task-21",
    clientId: "client-3",
    client: c3,
    taxTypeId: "tt-8",
    taxType: c3.taxTypes[1], // ภ.ง.ด.1
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2026-02-28T00:00:00.000Z",
    // R-01: fixed day 15 → 2026-03-15
    dueDate: "2026-03-15T00:00:00.000Z",
    ruleUsed: "R-01: ภ.ง.ด.1 — วันที่ 15 เดือนถัดไป",
    status: "SUBMITTED",
    priority: "LOW",
    mddScore: 0,
    evidenceUrl: "https://storage.mali.app/evidence/task-21-wht-feb2026.pdf",
    note: "ยื่นเรียบร้อยแล้ว",
    createdAt: "2026-02-20T00:00:00.000Z",
    updatedAt: "2026-03-05T00:00:00.000Z",
  },
  {
    id: "task-22",
    clientId: "client-5",
    client: c5,
    taxTypeId: "tt-12",
    taxType: c5.taxTypes[0], // ภ.ง.ด.50 (FY Oct–Sep)
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2025-09-30T00:00:00.000Z",
    dueDate: "2026-02-27T00:00:00.000Z",
    ruleUsed: "R-09: ภ.ง.ด.50 — +150 วันหลังสิ้นรอบบัญชี",
    status: "SUBMITTED",
    priority: "LOW",
    mddScore: 0,
    evidenceUrl: "https://storage.mali.app/evidence/task-22-cit-fy2025.pdf",
    note: "ยื่นพร้อมชำระภาษีเรียบร้อย ได้รับใบเสร็จแล้ว",
    createdAt: "2025-10-01T00:00:00.000Z",
    updatedAt: "2026-02-25T00:00:00.000Z",
  },
  {
    id: "task-23",
    clientId: "client-7",
    client: c7,
    taxTypeId: "tt-20",
    taxType: c7.taxTypes[1], // ภ.พ.30
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2026-02-28T00:00:00.000Z",
    // R-04: fixed day 23 → 2026-03-23
    dueDate: "2026-03-23T00:00:00.000Z",
    ruleUsed: "R-04: ภ.พ.30 — วันที่ 23 เดือนถัดไป",
    status: "SUBMITTED",
    priority: "LOW",
    mddScore: 0,
    evidenceUrl: "https://storage.mali.app/evidence/task-23-vat-feb2026.pdf",
    note: "ยื่นผ่านระบบ RD Smart Tax เรียบร้อย",
    createdAt: "2026-02-28T00:00:00.000Z",
    updatedAt: "2026-03-12T00:00:00.000Z",
  },
  {
    id: "task-24",
    clientId: "client-6",
    client: c6,
    taxTypeId: "tt-18",
    taxType: c6.taxTypes[3], // ภ.ง.ด.3
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-02-28T00:00:00.000Z",
    // R-02: fixed day 15 → 2026-03-15
    dueDate: "2026-03-15T00:00:00.000Z",
    ruleUsed: "R-02: ภ.ง.ด.3 — วันที่ 15 เดือนถัดไป",
    status: "SUBMITTED",
    priority: "LOW",
    mddScore: 0,
    evidenceUrl: "https://storage.mali.app/evidence/task-24-wht3-feb2026.pdf",
    createdAt: "2026-02-20T00:00:00.000Z",
    updatedAt: "2026-03-06T00:00:00.000Z",
  },
  {
    id: "task-25",
    clientId: "client-8",
    client: c8,
    taxTypeId: "tt-23",
    taxType: c8.taxTypes[1], // ภ.ง.ด.3
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-02-28T00:00:00.000Z",
    // R-02: fixed day 15 → 2026-03-15
    dueDate: "2026-03-15T00:00:00.000Z",
    ruleUsed: "R-02: ภ.ง.ด.3 — วันที่ 15 เดือนถัดไป",
    status: "SUBMITTED",
    priority: "LOW",
    mddScore: 0,
    evidenceUrl: "https://storage.mali.app/evidence/task-25-wht3-feb2026.pdf",
    note: "ยื่นแทนผ่าน e-Withholding Tax",
    createdAt: "2026-02-25T00:00:00.000Z",
    updatedAt: "2026-03-04T00:00:00.000Z",
  },
  {
    id: "task-26",
    clientId: "client-10",
    client: c10,
    taxTypeId: "tt-29",
    taxType: c10.taxTypes[1], // ภ.พ.30
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    // R-04: fixed day 23 → 2026-04-23
    dueDate: "2026-04-23T00:00:00.000Z",
    ruleUsed: "R-04: ภ.พ.30 — วันที่ 23 เดือนถัดไป",
    status: "SUBMITTED",
    priority: "LOW",
    mddScore: 0,
    evidenceUrl: "https://storage.mali.app/evidence/task-26-vat-mar2026.pdf",
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-04-12T00:00:00.000Z",
  },
  {
    id: "task-27",
    clientId: "client-3",
    client: c3,
    taxTypeId: "tt-9",
    taxType: c3.taxTypes[2], // ภ.พ.30
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    // R-04: fixed day 23 → 2026-04-23
    dueDate: "2026-04-23T00:00:00.000Z",
    ruleUsed: "R-04: ภ.พ.30 — วันที่ 23 เดือนถัดไป",
    status: "SUBMITTED",
    priority: "LOW",
    mddScore: 0,
    evidenceUrl: "https://storage.mali.app/evidence/task-27-vat-mar2026.pdf",
    note: "VAT ศูนย์ ไม่มีภาษีต้องชำระ",
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
  },
  {
    id: "task-28",
    clientId: "client-5",
    client: c5,
    taxTypeId: "tt-13",
    taxType: c5.taxTypes[1], // ภ.ง.ด.51 (FY Oct–Sep)
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    dueDate: "2026-05-30T00:00:00.000Z",
    ruleUsed: "R-15: ภ.ง.ด.51 — +60 วันหลังครบ 6 เดือน",
    status: "TODO",
    priority: "MEDIUM",
    mddScore: 50.0,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "task-29",
    clientId: "client-2",
    client: c2,
    taxTypeId: "tt-5",
    taxType: c2.taxTypes[1], // ภ.ง.ด.51 (FY Apr–Mar)
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2025-09-30T00:00:00.000Z",
    dueDate: "2025-11-29T00:00:00.000Z",
    ruleUsed: "R-15: ภ.ง.ด.51 — +60 วันหลังครบ 6 เดือน",
    status: "SUBMITTED",
    priority: "LOW",
    mddScore: 0,
    evidenceUrl: "https://storage.mali.app/evidence/task-29-cit51-hy2025.pdf",
    note: "ยื่นพร้อมประมาณการกำไรสุทธิครึ่งปี",
    createdAt: "2025-09-15T00:00:00.000Z",
    updatedAt: "2025-11-20T00:00:00.000Z",
  },
  {
    id: "task-30",
    clientId: "client-10",
    client: c10,
    taxTypeId: "tt-30",
    taxType: c10.taxTypes[2], // ภ.ง.ด.1
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2026-03-31T00:00:00.000Z",
    // R-01: fixed day 15 → 2026-04-15
    dueDate: "2026-04-15T00:00:00.000Z",
    ruleUsed: "R-01: ภ.ง.ด.1 — วันที่ 15 เดือนถัดไป",
    status: "SUBMITTED",
    priority: "LOW",
    mddScore: 0,
    evidenceUrl: "https://storage.mali.app/evidence/task-30-wht1-mar2026.pdf",
    createdAt: "2026-03-25T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
  },
];

// ─── Notification Logs (25 records) ──────────────────────────────────────────
export const MOCK_NOTIFICATIONS: NotificationLog[] = [
  // D-5 Alerts
  { id: "notif-1",  taskId: "task-4",  userId: "user-2", type: "REMINDER",   sentAt: "2026-04-10T08:00:00.000Z" },
  { id: "notif-2",  taskId: "task-5",  userId: "user-2", type: "REMINDER",   sentAt: "2026-04-10T08:00:00.000Z" },
  { id: "notif-3",  taskId: "task-7",  userId: "user-3", type: "REMINDER",   sentAt: "2026-04-02T08:00:00.000Z" },
  { id: "notif-4",  taskId: "task-8",  userId: "user-3", type: "REMINDER",   sentAt: "2026-04-02T08:00:00.000Z" },
  { id: "notif-5",  taskId: "task-6",  userId: "user-2", type: "REMINDER",   sentAt: "2026-04-10T08:00:00.000Z" },
  // D-1 Warnings
  { id: "notif-6",  taskId: "task-20", userId: "user-2", type: "REMINDER",   sentAt: "2026-04-14T08:00:00.000Z" },
  { id: "notif-7",  taskId: "task-26", userId: "user-2", type: "REMINDER",   sentAt: "2026-04-14T08:00:00.000Z" },
  { id: "notif-8",  taskId: "task-30", userId: "user-2", type: "REMINDER",   sentAt: "2026-04-06T08:00:00.000Z" },
  // Escalation Alerts (งานเกินกำหนด)
  { id: "notif-9",  taskId: "task-1",  userId: "user-1", type: "ESCALATION", sentAt: "2026-03-08T08:00:00.000Z" },
  { id: "notif-10", taskId: "task-2",  userId: "user-1", type: "ESCALATION", sentAt: "2026-03-08T08:00:00.000Z" },
  { id: "notif-11", taskId: "task-3",  userId: "user-1", type: "ESCALATION", sentAt: "2026-03-08T08:00:00.000Z" },
  { id: "notif-12", taskId: "task-1",  userId: "user-1", type: "ESCALATION", sentAt: "2026-03-15T08:00:00.000Z" },
  { id: "notif-13", taskId: "task-3",  userId: "user-1", type: "ESCALATION", sentAt: "2026-03-15T08:00:00.000Z" },
  // Manual Escalation (Supervisor กดส่งเอง)
  { id: "notif-14", taskId: "task-1",  userId: "user-1", type: "MANUAL",     sentAt: "2026-04-01T10:30:00.000Z" },
  { id: "notif-15", taskId: "task-2",  userId: "user-1", type: "MANUAL",     sentAt: "2026-04-01T10:32:00.000Z" },
  // Daily Summaries
  { id: "notif-16", taskId: "task-9",  userId: "user-2", type: "REMINDER",   sentAt: "2026-04-15T08:00:00.000Z" },
  { id: "notif-17", taskId: "task-11", userId: "user-2", type: "REMINDER",   sentAt: "2026-04-15T08:00:00.000Z" },
  { id: "notif-18", taskId: "task-10", userId: "user-3", type: "REMINDER",   sentAt: "2026-04-15T08:00:00.000Z" },
  { id: "notif-19", taskId: "task-12", userId: "user-3", type: "REMINDER",   sentAt: "2026-04-15T08:00:00.000Z" },
  { id: "notif-20", taskId: "task-13", userId: "user-3", type: "REMINDER",   sentAt: "2026-04-15T08:00:00.000Z" },
  // แจ้งเตือนงานที่ยื่นแล้ว (confirm)
  { id: "notif-21", taskId: "task-22", userId: "user-2", type: "REMINDER",   sentAt: "2026-02-22T08:00:00.000Z" },
  { id: "notif-22", taskId: "task-21", userId: "user-3", type: "REMINDER",   sentAt: "2026-03-02T08:00:00.000Z" },
  { id: "notif-23", taskId: "task-24", userId: "user-2", type: "REMINDER",   sentAt: "2026-03-02T08:00:00.000Z" },
  { id: "notif-24", taskId: "task-25", userId: "user-2", type: "REMINDER",   sentAt: "2026-03-02T08:00:00.000Z" },
  { id: "notif-25", taskId: "task-29", userId: "user-2", type: "ESCALATION", sentAt: "2025-11-25T08:00:00.000Z" },
];

// ─── In-memory store (mutable for CRUD operations in dev) ────────────────────

let _clients = [...MOCK_CLIENTS];
let _tasks = [...MOCK_TASKS];
let _notifications = [...MOCK_NOTIFICATIONS];
let _idCounter = 200;

function nextId(prefix: string) {
  return `${prefix}-${++_idCounter}`;
}

// ── Client CRUD ──
export function getAllClients(): Client[] {
  return _clients;
}

export function getClientById(id: string): Client | undefined {
  return _clients.find((c) => c.id === id);
}

export function createClient(data: Omit<Client, "id" | "createdAt">): Client {
  const client: Client = {
    ...data,
    id: nextId("client"),
    createdAt: new Date().toISOString(),
  };
  _clients.push(client);
  return client;
}

export function updateClient(
  id: string,
  data: Partial<Omit<Client, "id" | "createdAt">>
): Client | null {
  const idx = _clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  _clients[idx] = { ..._clients[idx], ...data };
  return _clients[idx];
}

export function deleteClient(id: string): boolean {
  const len = _clients.length;
  _clients = _clients.filter((c) => c.id !== id);
  return _clients.length < len;
}

// ── Task CRUD ──
export function getAllTasks(): Task[] {
  return _tasks;
}

export function getTaskById(id: string): Task | undefined {
  return _tasks.find((t) => t.id === id);
}

export function getTasksByUser(userId: string): Task[] {
  return _tasks.filter((t) => t.assignedUserId === userId);
}

export function updateTask(
  id: string,
  data: Partial<Omit<Task, "id" | "createdAt" | "client" | "taxType" | "assignedUser">>
): Task | null {
  const idx = _tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  let updatedUser = _tasks[idx].assignedUser;
  if (data.assignedUserId && data.assignedUserId !== _tasks[idx].assignedUserId) {
    const found = MOCK_USERS.find((u) => u.id === data.assignedUserId);
    if (found) updatedUser = found;
  }

  _tasks[idx] = {
    ..._tasks[idx],
    ...data,
    assignedUser: updatedUser,
    updatedAt: new Date().toISOString(),
  };
  return _tasks[idx];
}

export function createTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
  const task: Task = {
    ...data,
    id: nextId("task"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  _tasks.push(task);
  return task;
}

// ── Notifications ──
export function createNotification(
  data: Omit<NotificationLog, "id" | "sentAt">
): NotificationLog {
  const log: NotificationLog = {
    ...data,
    id: nextId("notif"),
    sentAt: new Date().toISOString(),
  };
  _notifications.push(log);
  return log;
}

export function getAllNotifications(): NotificationLog[] {
  return _notifications;
}

// ── Auth helpers ──
export function getUserByEmail(email: string): User | undefined {
  return MOCK_USERS.find((u) => u.email === email);
}

export function getUserById(id: string): User | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}

export function updateUser(id: string, data: Partial<Pick<User, "name" | "password">>): User | undefined {
  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) return undefined;
  if (data.name) user.name = data.name;
  if (data.password) user.password = data.password;
  return user;
}
