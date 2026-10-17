import { describe, expect, it } from "vitest";
import { canAccessTaskWithScope, NO_TEAM_SCOPE, taskAccessWhere } from "./taskAccess";

const LEAD_SCOPE = { teamIds: ["team-1"], memberIds: ["staff-a", "staff-b"] };
const STAFF = { id: "staff-a", role: "STAFF" };
const LEAD = { id: "lead", role: "STAFF" };
const BOSS = { id: "boss", role: "SUPERVISOR" };

function task(assignedUserId: string, teamId: string | null) {
  return { assignedUserId, client: { teamId } };
}

describe("canAccessTaskWithScope", () => {
  it("supervisors can open anything", () => {
    expect(canAccessTaskWithScope(BOSS, task("someone", "team-9"), NO_TEAM_SCOPE)).toBe(true);
  });

  it("staff can open their own tasks and nobody else's", () => {
    expect(canAccessTaskWithScope(STAFF, task("staff-a", "team-1"), NO_TEAM_SCOPE)).toBe(true);
    expect(canAccessTaskWithScope(STAFF, task("staff-b", "team-1"), NO_TEAM_SCOPE)).toBe(false);
  });

  it("a team lead can open tasks of clients in the team they lead", () => {
    expect(canAccessTaskWithScope(LEAD, task("staff-a", "team-1"), LEAD_SCOPE)).toBe(true);
  });

  it("a team lead cannot open tasks of another team's clients, even if the assignee is in their team", () => {
    expect(canAccessTaskWithScope(LEAD, task("staff-a", "team-2"), LEAD_SCOPE)).toBe(false);
  });

  it("when the client has no team, membership of the assignee decides", () => {
    expect(canAccessTaskWithScope(LEAD, task("staff-b", null), LEAD_SCOPE)).toBe(true);
    expect(canAccessTaskWithScope(LEAD, task("outsider", null), LEAD_SCOPE)).toBe(false);
  });

  it("a lead still always has access to tasks assigned to themselves", () => {
    expect(canAccessTaskWithScope(LEAD, task("lead", "team-9"), LEAD_SCOPE)).toBe(true);
  });
});

describe("taskAccessWhere", () => {
  it("is just 'assigned to me' for someone who leads no team", () => {
    expect(taskAccessWhere("u1", NO_TEAM_SCOPE)).toEqual({ assignedUserId: "u1" });
  });

  it("widens to the team's clients and teamless clients whose assignee is a member for a lead", () => {
    expect(taskAccessWhere("lead", LEAD_SCOPE)).toEqual({
      OR: [
        { assignedUserId: "lead" },
        { client: { teamId: { in: ["team-1"] } } },
        { client: { teamId: null }, assignedUserId: { in: ["staff-a", "staff-b"] } },
      ],
    });
  });
});
