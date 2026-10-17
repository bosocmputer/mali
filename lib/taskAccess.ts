import type { Prisma } from "@/lib/generated/prisma/client";

/** Teams a user leads, and everyone who belongs to them. */
export type LedTeamScope = { teamIds: string[]; memberIds: string[] };

export const NO_TEAM_SCOPE: LedTeamScope = { teamIds: [], memberIds: [] };

/**
 * Which tasks a non-supervisor may see and edit: their own, plus — if they lead a team — the
 * team's. A task belongs to a team through its client's team; a client without a team falls back
 * to the assignee's team membership (the same rule the escalation notices use to find the lead).
 */
export function taskAccessWhere(userId: string, scope: LedTeamScope): Prisma.TaskWhereInput {
  if (scope.teamIds.length === 0) return { assignedUserId: userId };
  return {
    OR: [
      { assignedUserId: userId },
      { client: { teamId: { in: scope.teamIds } } },
      { client: { teamId: null }, assignedUserId: { in: scope.memberIds } },
    ],
  };
}

export function canAccessTaskWithScope(
  user: { id: string; role: string },
  task: { assignedUserId: string; client: { teamId?: string | null } },
  scope: LedTeamScope
): boolean {
  if (user.role === "SUPERVISOR" || task.assignedUserId === user.id) return true;
  if (scope.teamIds.length === 0) return false;
  if (task.client.teamId) return scope.teamIds.includes(task.client.teamId);
  return scope.memberIds.includes(task.assignedUserId);
}
