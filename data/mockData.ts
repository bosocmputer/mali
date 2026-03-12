import { User, Client, TaxType, Rule, Task, NotificationLog } from "@/types";

// ─── Users ───────────────────────────────────────────────────────────────────
// Passwords stored as bcrypt hash of "password123"
export const MOCK_USERS: User[] = [
  {
    id: "user-1",
    name: "สมชาย ผู้จัดการ",
    email: "supervisor@mali.com",
    // bcrypt hash of "password123"
    password: "$2b$12$Ur..EvRF4BfAAo2OzxOWiOKSBYHqakC0s.B7CTO/gO45fDzSFQT4K",
    role: "SUPERVISOR",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "user-2",
    name: "สมหญิง เจ้าหน้าที่",
    email: "staff1@mali.com",
    password: "$2b$12$Ur..EvRF4BfAAo2OzxOWiOKSBYHqakC0s.B7CTO/gO45fDzSFQT4K",
    role: "STAFF",
    createdAt: "2024-01-02T00:00:00.000Z",
  },
  {
    id: "user-3",
    name: "วิชัย นักบัญชี",
    email: "staff2@mali.com",
    password: "$2b$12$Ur..EvRF4BfAAo2OzxOWiOKSBYHqakC0s.B7CTO/gO45fDzSFQT4K",
    role: "STAFF",
    createdAt: "2024-01-03T00:00:00.000Z",
  },
];

// ─── Tax Types (will be embedded into clients) ────────────────────────────────
export const MOCK_TAX_TYPES: TaxType[] = [
  { id: "tt-1", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-1" },
  { id: "tt-2", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-1" },
  { id: "tt-3", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-2" },
  { id: "tt-4", name: "ภ.ง.ด.51", frequency: "ANNUAL", clientId: "client-2" },
  { id: "tt-5", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-2" },
  { id: "tt-6", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-3" },
  { id: "tt-7", name: "ภ.ง.ด.1", frequency: "MONTHLY", clientId: "client-3" },
  { id: "tt-8", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-4" },
  { id: "tt-9", name: "ภ.ง.ด.3", frequency: "MONTHLY", clientId: "client-4" },
  { id: "tt-10", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-5" },
  { id: "tt-11", name: "ภ.ง.ด.51", frequency: "ANNUAL", clientId: "client-5" },
];

// ─── Clients ─────────────────────────────────────────────────────────────────
export const MOCK_CLIENTS: Client[] = [
  {
    id: "client-1",
    companyName: "บริษัท เอบีซี จำกัด",
    businessType: "การค้า",
    fiscalYearStart: 1,
    fiscalYearEnd: 12,
    isNonStandard: false,
    taxTypes: [
      { id: "tt-1", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-1" },
      { id: "tt-2", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-1" },
    ],
    createdAt: "2024-01-10T00:00:00.000Z",
  },
  {
    id: "client-2",
    companyName: "ห้างหุ้นส่วนจำกัด ดีเอ็กซ์วาย",
    businessType: "อุตสาหกรรม",
    fiscalYearStart: 4,
    fiscalYearEnd: 3,
    isNonStandard: true,
    taxTypes: [
      { id: "tt-3", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-2" },
      { id: "tt-4", name: "ภ.ง.ด.51", frequency: "ANNUAL", clientId: "client-2" },
      { id: "tt-5", name: "ภ.พ.30", frequency: "MONTHLY", clientId: "client-2" },
    ],
    createdAt: "2024-02-01T00:00:00.000Z",
  },
  {
    id: "client-3",
    companyName: "บริษัท กรีนเทค โซลูชั่น จำกัด",
    businessType: "เทคโนโลยี",
    fiscalYearStart: 7,
    fiscalYearEnd: 6,
    isNonStandard: true,
    taxTypes: [
      { id: "tt-6", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-3" },
      { id: "tt-7", name: "ภ.ง.ด.1", frequency: "MONTHLY", clientId: "client-3" },
    ],
    createdAt: "2024-02-15T00:00:00.000Z",
  },
  {
    id: "client-4",
    companyName: "บริษัท สยามโลจิสติกส์ จำกัด (มหาชน)",
    businessType: "โลจิสติกส์",
    fiscalYearStart: 1,
    fiscalYearEnd: 12,
    isNonStandard: false,
    taxTypes: [
      { id: "tt-8", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-4" },
      { id: "tt-9", name: "ภ.ง.ด.3", frequency: "MONTHLY", clientId: "client-4" },
    ],
    createdAt: "2024-03-01T00:00:00.000Z",
  },
  {
    id: "client-5",
    companyName: "ห้างหุ้นส่วนจำกัด ไทยฟู้ดส์",
    businessType: "อาหารและเครื่องดื่ม",
    fiscalYearStart: 10,
    fiscalYearEnd: 9,
    isNonStandard: true,
    taxTypes: [
      { id: "tt-10", name: "ภ.ง.ด.50", frequency: "ANNUAL", clientId: "client-5" },
      { id: "tt-11", name: "ภ.ง.ด.51", frequency: "ANNUAL", clientId: "client-5" },
    ],
    createdAt: "2024-03-10T00:00:00.000Z",
  },
];

// ─── Rules ────────────────────────────────────────────────────────────────────
export const MOCK_RULES: Rule[] = [
  {
    id: "rule-1",
    name: "ภ.ง.ด.50 มาตรฐาน",
    description: "ยื่นภายใน 150 วันหลังสิ้นรอบบัญชี",
    daysOffset: 150,
    taxTypeName: "ภ.ง.ด.50",
  },
  {
    id: "rule-2",
    name: "ภ.ง.ด.51 กึ่งปี",
    description: "ยื่นภายใน 60 วันหลังครบ 6 เดือน",
    daysOffset: 60,
    taxTypeName: "ภ.ง.ด.51",
  },
  {
    id: "rule-3",
    name: "ภ.พ.30 รายเดือน",
    description: "ยื่นภายในวันที่ 15 ของเดือนถัดไป",
    daysOffset: 15,
    taxTypeName: "ภ.พ.30",
  },
  {
    id: "rule-4",
    name: "ภ.ง.ด.1 รายเดือน",
    description: "ยื่นภายในวันที่ 7 ของเดือนถัดไป",
    daysOffset: 7,
    taxTypeName: "ภ.ง.ด.1",
  },
  {
    id: "rule-5",
    name: "ภ.ง.ด.3 รายเดือน",
    description: "ยื่นภายในวันที่ 7 ของเดือนถัดไป",
    daysOffset: 7,
    taxTypeName: "ภ.ง.ด.3",
  },
];

const u1 = MOCK_USERS[0];
const u2 = MOCK_USERS[1];
const u3 = MOCK_USERS[2];
const c1 = MOCK_CLIENTS[0];
const c2 = MOCK_CLIENTS[1];
const c3 = MOCK_CLIENTS[2];
const c4 = MOCK_CLIENTS[3];
const c5 = MOCK_CLIENTS[4];

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const MOCK_TASKS: Task[] = [
  {
    id: "task-1",
    clientId: "client-1",
    client: c1,
    taxTypeId: "tt-1",
    taxType: c1.taxTypes[0],
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2024-12-31T00:00:00.000Z",
    dueDate: "2025-05-30T00:00:00.000Z",
    ruleUsed: "ภ.ง.ด.50 มาตรฐาน (150 วัน)",
    status: "TODO",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "task-2",
    clientId: "client-1",
    client: c1,
    taxTypeId: "tt-2",
    taxType: c1.taxTypes[1],
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2025-02-28T00:00:00.000Z",
    dueDate: "2025-03-15T00:00:00.000Z",
    ruleUsed: "ภ.พ.30 รายเดือน (15 วัน)",
    status: "SUBMITTED",
    evidenceUrl: "https://example.com/evidence/task-2.pdf",
    note: "ยื่นเรียบร้อยแล้ว",
    createdAt: "2025-02-01T00:00:00.000Z",
    updatedAt: "2025-03-14T00:00:00.000Z",
  },
  {
    id: "task-3",
    clientId: "client-2",
    client: c2,
    taxTypeId: "tt-3",
    taxType: c2.taxTypes[0],
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2025-03-31T00:00:00.000Z",
    dueDate: "2025-08-28T00:00:00.000Z",
    ruleUsed: "ภ.ง.ด.50 มาตรฐาน (150 วัน)",
    status: "PROCESSING",
    note: "รอเอกสารจากลูกค้า",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
  },
  {
    id: "task-4",
    clientId: "client-2",
    client: c2,
    taxTypeId: "tt-4",
    taxType: c2.taxTypes[1],
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2024-09-30T00:00:00.000Z",
    dueDate: "2024-11-29T00:00:00.000Z",
    ruleUsed: "ภ.ง.ด.51 กึ่งปี (60 วัน)",
    status: "TODO",
    createdAt: "2024-10-01T00:00:00.000Z",
    updatedAt: "2024-10-01T00:00:00.000Z",
  },
  {
    id: "task-5",
    clientId: "client-3",
    client: c3,
    taxTypeId: "tt-6",
    taxType: c3.taxTypes[0],
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2024-06-30T00:00:00.000Z",
    dueDate: "2024-11-27T00:00:00.000Z",
    ruleUsed: "ภ.ง.ด.50 มาตรฐาน (150 วัน)",
    status: "SUBMITTED",
    evidenceUrl: "https://example.com/evidence/task-5.pdf",
    createdAt: "2024-07-01T00:00:00.000Z",
    updatedAt: "2024-11-25T00:00:00.000Z",
  },
  {
    id: "task-6",
    clientId: "client-3",
    client: c3,
    taxTypeId: "tt-7",
    taxType: c3.taxTypes[1],
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2025-02-28T00:00:00.000Z",
    dueDate: "2025-03-07T00:00:00.000Z",
    ruleUsed: "ภ.ง.ด.1 รายเดือน (7 วัน)",
    status: "TODO",
    createdAt: "2025-02-01T00:00:00.000Z",
    updatedAt: "2025-02-01T00:00:00.000Z",
  },
  {
    id: "task-7",
    clientId: "client-4",
    client: c4,
    taxTypeId: "tt-8",
    taxType: c4.taxTypes[0],
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2024-12-31T00:00:00.000Z",
    dueDate: "2025-05-30T00:00:00.000Z",
    ruleUsed: "ภ.ง.ด.50 มาตรฐาน (150 วัน)",
    status: "PROCESSING",
    note: "อยู่ระหว่างตรวจสอบงบการเงิน",
    createdAt: "2025-01-05T00:00:00.000Z",
    updatedAt: "2025-02-20T00:00:00.000Z",
  },
  {
    id: "task-8",
    clientId: "client-4",
    client: c4,
    taxTypeId: "tt-9",
    taxType: c4.taxTypes[1],
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2025-01-31T00:00:00.000Z",
    dueDate: "2025-02-07T00:00:00.000Z",
    ruleUsed: "ภ.ง.ด.3 รายเดือน (7 วัน)",
    status: "TODO",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    id: "task-9",
    clientId: "client-5",
    client: c5,
    taxTypeId: "tt-10",
    taxType: c5.taxTypes[0],
    assignedUserId: "user-3",
    assignedUser: u3,
    fiscalYearEndDate: "2024-09-30T00:00:00.000Z",
    dueDate: "2025-02-27T00:00:00.000Z",
    ruleUsed: "ภ.ง.ด.50 มาตรฐาน (150 วัน)",
    status: "SUBMITTED",
    evidenceUrl: "https://example.com/evidence/task-9.pdf",
    note: "ยื่นพร้อมชำระภาษีเรียบร้อย",
    createdAt: "2024-10-01T00:00:00.000Z",
    updatedAt: "2025-02-25T00:00:00.000Z",
  },
  {
    id: "task-10",
    clientId: "client-5",
    client: c5,
    taxTypeId: "tt-11",
    taxType: c5.taxTypes[1],
    assignedUserId: "user-2",
    assignedUser: u2,
    fiscalYearEndDate: "2024-03-31T00:00:00.000Z",
    dueDate: "2024-05-30T00:00:00.000Z",
    ruleUsed: "ภ.ง.ด.51 กึ่งปี (60 วัน)",
    status: "TODO",
    note: "รอข้อมูลเพิ่มเติมจากผู้ประกอบการ",
    createdAt: "2024-04-01T00:00:00.000Z",
    updatedAt: "2024-04-01T00:00:00.000Z",
  },
];

export const MOCK_NOTIFICATIONS: NotificationLog[] = [];

// ─── In-memory store (mutable for CRUD operations in dev) ────────────────────

let _clients = [...MOCK_CLIENTS];
let _tasks = [...MOCK_TASKS];
let _notifications = [...MOCK_NOTIFICATIONS];
let _idCounter = 100;

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

  // If assignedUserId changed, update the embedded assignedUser
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

// ── Auth helper ──
export function getUserByEmail(email: string): User | undefined {
  return MOCK_USERS.find((u) => u.email === email);
}
