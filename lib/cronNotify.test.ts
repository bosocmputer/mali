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

const USERS: Record<string, { id: string; name: string; lineUserId: string | null }> = {
  staff: { id: "staff", name: "Staff", lineUserId: "U-staff" },
  lead: { id: "lead", name: "Lead", lineUserId: "U-lead" },
  nolinestaff: { id: "nolinestaff", name: "No Line", lineUserId: null },
};

beforeEach(() => {
  vi.clearAllMocks();
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
});
