import { describe, expect, it } from "vitest";
import { canEditClientWithScope } from "./clientAccess";
import { NO_TEAM_SCOPE } from "./taskAccess";

const staff = { id: "s1", role: "STAFF" };
const lead = { id: "lead", role: "STAFF" };
const teamScope = { teamIds: ["t1"], memberIds: ["s2", "lead"] };

describe("canEditClientWithScope", () => {
  it("supervisors edit everything", () => {
    expect(canEditClientWithScope({ id: "x", role: "SUPERVISOR" }, {}, NO_TEAM_SCOPE)).toBe(true);
  });

  it("staff edit companies they are responsible for, by company or tax type", () => {
    expect(canEditClientWithScope(staff, { assignedStaffId: "s1" }, NO_TEAM_SCOPE)).toBe(true);
    expect(canEditClientWithScope(staff, { assignedStaffId: "s2", taxTypes: [{ assignedStaffId: "s1" }] }, NO_TEAM_SCOPE)).toBe(true);
    expect(canEditClientWithScope(staff, { assignedStaffId: "s2" }, NO_TEAM_SCOPE)).toBe(false);
  });

  it("team leads edit their team's companies", () => {
    expect(canEditClientWithScope(lead, { assignedStaffId: "zz", teamId: "t1" }, teamScope)).toBe(true);
    expect(canEditClientWithScope(lead, { assignedStaffId: "s2", teamId: null }, teamScope)).toBe(true);
    expect(canEditClientWithScope(lead, { assignedStaffId: "s2", teamId: "t9" }, teamScope)).toBe(false);
    expect(canEditClientWithScope(lead, { assignedStaffId: "s9", teamId: null }, teamScope)).toBe(false);
  });
});
