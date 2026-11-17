import type { LedTeamScope } from "@/lib/taskAccess";

type ClientOwnership = {
  assignedStaffId?: string | null;
  teamId?: string | null;
  taxTypes?: { assignedStaffId?: string | null }[];
};

/**
 * Who may edit a company (FR-70, FR-86, answer 10 from the customer):
 * supervisors — any company; staff — companies they are responsible for (the company, or one of
 * its tax types, is assigned to them); team leads — also their team's companies (by the company's
 * team, or for a company without a team, by its responsible person being in the team).
 * Deleting stays supervisor-only, and so do assignments (who is responsible, which team).
 */
export function canEditClientWithScope(
  user: { id: string; role: string },
  client: ClientOwnership,
  scope: LedTeamScope
): boolean {
  if (user.role === "SUPERVISOR") return true;
  if (client.assignedStaffId === user.id) return true;
  if (client.taxTypes?.some((t) => t.assignedStaffId === user.id)) return true;
  if (scope.teamIds.length === 0) return false;
  if (client.teamId) return scope.teamIds.includes(client.teamId);
  return !!client.assignedStaffId && scope.memberIds.includes(client.assignedStaffId);
}
