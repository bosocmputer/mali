import { beforeEach, describe, expect, it, vi } from "vitest";

const sendLineMessage = vi.fn();
const createNotificationInDb = vi.fn();
const findManyLogs = vi.fn();
const getAllTeamsFromDb = vi.fn();
const getUserByIdFromDb = vi.fn();

vi.mock("@/lib/lineClient", () => ({
  sendLineMessage: (...args: unknown[]) => sendLineMessage(...args),
  LineSendError: class LineSendError extends Error {},
}));
vi.mock("@/lib/db", () => ({
  prisma: { notificationLog: { findMany: (...args: unknown[]) => findManyLogs(...args) } },
}));
vi.mock("@/lib/repositories/notifications", () => ({
  createNotificationInDb: (...args: unknown[]) => createNotificationInDb(...args),
}));
vi.mock("@/lib/repositories/teams", () => ({
  getAllTeamsFromDb: () => getAllTeamsFromDb(),
}));
vi.mock("@/lib/repositories/users", () => ({
  getUserByIdFromDb: (id: string) => getUserByIdFromDb(id),
}));

import { notifyBatch } from "./cronNotify";

function task(id: string, assignedUserId: string, teamId: string | null = "team-1") {
  return {
    id,
    assignedUserId,
    dueDate: new Date("2026-10-15T00:00:00.000Z"),
    client: { companyName: `Company ${id}`, teamId },
    taxType: { name: "ภ.ง.ด.3" },
  };
}

const USERS: Record<string, { id: string; name: string; lineUserId: string | null; role: string }> = {
  staff: { id: "staff", name: "Staff", lineUserId: "U-staff", role: "STAFF" },
  lead: { id: "lead", name: "Lead", lineUserId: "U-lead", role: "STAFF" },
  boss: { id: "boss", name: "Boss", lineUserId: "U-boss", role: "SUPERVISOR" },
  nolinestaff: { id: "nolinestaff", name: "No Line", lineUserId: null, role: "STAFF" },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_URL = "http://10.158.8.86:3000";
  sendLineMessage.mockResolvedValue(undefined);
  createNotificationInDb.mockResolvedValue({});
  findManyLogs.mockResolvedValue([]);
  getAllTeamsFromDb.mockResolvedValue([{ id: "team-1", leadUserId: "lead", memberIds: ["staff", "nolinestaff"] }]);
  getUserByIdFromDb.mockImplementation(async (id: string) => USERS[id] ?? null);
});

describe("notifyBatch", () => {
  it("REMINDER goes to the assignee only, and is logged after the send", async () => {
    const result = await notifyBatch("REMINDER", [task("t1", "staff")], 7);

    expect(sendLineMessage).toHaveBeenCalledTimes(1);
    expect(sendLineMessage.mock.calls[0][0]).toBe("U-staff");
    expect(createNotificationInDb).toHaveBeenCalledWith({ taskId: "t1", userId: "staff", type: "REMINDER" });
    expect(result).toMatchObject({ notifiedUsers: 1, failedUsers: 0, usersWithoutLine: 0, skippedTasks: 0 });
  });

  it("ESCALATION also goes to the team lead, and the lead gets a log row too", async () => {
    const result = await notifyBatch("ESCALATION", [task("t1", "staff")]);

    expect(sendLineMessage.mock.calls.map((c) => c[0]).sort()).toEqual(["U-lead", "U-staff"]);
    expect(createNotificationInDb).toHaveBeenCalledWith({ taskId: "t1", userId: "lead", type: "ESCALATION" });
    expect(createNotificationInDb).toHaveBeenCalledWith({ taskId: "t1", userId: "staff", type: "ESCALATION" });
    expect(result.notifiedUsers).toBe(2);
  });

  it("sends one message per recipient containing all of their tasks", async () => {
    await notifyBatch("REMINDER", [task("t1", "staff"), task("t2", "staff")], 7);
    expect(sendLineMessage).toHaveBeenCalledTimes(1);
    expect(createNotificationInDb).toHaveBeenCalledTimes(2);
  });

  it("does not log or send for a recipient with no LINE account, and counts them", async () => {
    const result = await notifyBatch("REMINDER", [task("t1", "nolinestaff")], 7);

    expect(sendLineMessage).not.toHaveBeenCalled();
    expect(createNotificationInDb).not.toHaveBeenCalled();
    expect(result).toMatchObject({ notifiedUsers: 0, usersWithoutLine: 1, failedUsers: 0 });
  });

  it("a failed LINE send is reported and NOT logged, so a re-run the same day retries it", async () => {
    sendLineMessage.mockImplementation(async (lineUserId: string) => {
      if (lineUserId === "U-lead") throw new Error("LINE ตอบกลับ 500");
    });

    const result = await notifyBatch("ESCALATION", [task("t1", "staff")]);

    expect(result).toMatchObject({ notifiedUsers: 1, failedUsers: 1 });
    expect(result.errors[0]).toContain("lead");
    expect(createNotificationInDb).toHaveBeenCalledTimes(1);
    expect(createNotificationInDb).toHaveBeenCalledWith({ taskId: "t1", userId: "staff", type: "ESCALATION" });
  });

  it("dedupes per (task, recipient): the lead is retried even though the assignee was already notified", async () => {
    findManyLogs.mockResolvedValue([{ taskId: "t1", userId: "staff" }]);

    const result = await notifyBatch("ESCALATION", [task("t1", "staff")]);

    expect(sendLineMessage).toHaveBeenCalledTimes(1);
    expect(sendLineMessage.mock.calls[0][0]).toBe("U-lead");
    expect(result.notifiedUsers).toBe(1);
  });

  it("skips everything and counts the task as skipped when all recipients were already notified today", async () => {
    findManyLogs.mockResolvedValue([
      { taskId: "t1", userId: "staff" },
      { taskId: "t1", userId: "lead" },
    ]);

    const result = await notifyBatch("ESCALATION", [task("t1", "staff")]);

    expect(sendLineMessage).not.toHaveBeenCalled();
    expect(result).toMatchObject({ notifiedUsers: 0, skippedTasks: 1 });
  });

  it("still counts the send as successful if only the log write fails, and reports it", async () => {
    createNotificationInDb.mockRejectedValue(new Error("db down"));

    const result = await notifyBatch("REMINDER", [task("t1", "staff")], 7);

    expect(result.notifiedUsers).toBe(1);
    expect(result.errors.join(" ")).toContain("log user staff");
  });

  it("returns an empty result without touching the DB when there are no tasks", async () => {
    const result = await notifyBatch("REMINDER", [], 7);
    expect(result).toMatchObject({ totalTasks: 0, notifiedUsers: 0 });
    expect(findManyLogs).not.toHaveBeenCalled();
  });

  describe("links in the card", () => {
    type Node = Record<string, unknown>;
    function collect(node: unknown, pred: (n: Node) => boolean, out: Node[] = []): Node[] {
      if (Array.isArray(node)) node.forEach((n) => collect(n, pred, out));
      else if (node && typeof node === "object") {
        if (pred(node as Node)) out.push(node as Node);
        Object.values(node as Node).forEach((v) => collect(v, pred, out));
      }
      return out;
    }
    const sentTo = (lineUserId: string) => sendLineMessage.mock.calls.find((c) => c[0] === lineUserId)?.[1];
    const rowUris = (msg: unknown) =>
      collect(msg, (n) => n.type === "box" && (n.action as Node | undefined)?.type === "uri").map(
        (n) => (n.action as Node).uri
      );
    const buttonUri = (msg: unknown) =>
      (collect(msg, (n) => n.type === "button")[0]?.action as Node | undefined)?.uri;

    it("an overdue escalation opens the overdue list from the button and each own task from its row", async () => {
      await notifyBatch("ESCALATION", [task("t1", "staff")]);

      const staffCard = sentTo("U-staff");
      expect(buttonUri(staffCard)).toBe("http://10.158.8.86:3000/tasks?status=OVERDUE");
      expect(rowUris(staffCard)).toEqual(["http://10.158.8.86:3000/tasks?taskId=t1"]);
    });

    it("a team lead who is staff can open their team's tasks from the card", async () => {
      await notifyBatch("ESCALATION", [task("t1", "staff")]);

      const leadCard = sentTo("U-lead");
      expect(rowUris(leadCard)).toEqual(["http://10.158.8.86:3000/tasks?taskId=t1"]);
      expect(buttonUri(leadCard)).toBe("http://10.158.8.86:3000/tasks?status=OVERDUE");
    });

    it("a reminder card lists only the recipient's own tasks, each opening its own task", async () => {
      await notifyBatch("REMINDER", [task("t1", "staff"), task("t2", "nolinestaff")], 7);

      expect(rowUris(sentTo("U-staff"))).toEqual(["http://10.158.8.86:3000/tasks?taskId=t1"]);
    });

    it("a supervisor can open any task in the card", async () => {
      getAllTeamsFromDb.mockResolvedValue([{ id: "team-1", leadUserId: "boss", memberIds: ["staff"] }]);
      await notifyBatch("ESCALATION", [task("t1", "staff")]);

      expect(rowUris(sentTo("U-boss"))).toEqual(["http://10.158.8.86:3000/tasks?taskId=t1"]);
    });

    it("a 7-day reminder opens the list of tasks due on that date", async () => {
      await notifyBatch("REMINDER", [task("t1", "staff")], 7);

      expect(buttonUri(sentTo("U-staff"))).toBe("http://10.158.8.86:3000/tasks?due=2026-10-15");
    });

    it("omits the button entirely when no app URL is configured", async () => {
      delete process.env.NEXTAUTH_URL;
      await notifyBatch("REMINDER", [task("t1", "staff")], 7);

      expect(buttonUri(sentTo("U-staff"))).toBeUndefined();
      expect(rowUris(sentTo("U-staff"))).toEqual([]);
    });
  });
});
