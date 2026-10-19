import { describe, expect, it } from "vitest";
import { taskStatusDisplay } from "./taskStatusDisplay";

describe("taskStatusDisplay", () => {
  it("always shows the real status, even when the task is overdue", () => {
    expect(taskStatusDisplay("TODO", true).label).toBe("รอดำเนินการ");
    expect(taskStatusDisplay("PROCESSING", true).label).toBe("กำลังดำเนินการ");
  });

  it("flags overdue separately from the label", () => {
    expect(taskStatusDisplay("TODO", true).late).toBe(true);
    expect(taskStatusDisplay("PROCESSING", true).late).toBe(true);
    expect(taskStatusDisplay("TODO", false).late).toBe(false);
  });

  it("never flags a submitted task as late", () => {
    expect(taskStatusDisplay("SUBMITTED", true)).toEqual({ label: "ยื่นแล้ว", late: false });
  });

  it("starting work on an overdue task changes the label to in-progress, not to overdue", () => {
    const before = taskStatusDisplay("TODO", true);
    const after = taskStatusDisplay("PROCESSING", true);
    expect(before.label).not.toBe(after.label);
    expect(after.label).not.toBe("เกินกำหนด");
  });
});
