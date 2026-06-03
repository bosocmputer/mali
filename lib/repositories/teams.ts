import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { toTeam } from "@/lib/dbMappers";
import type { Team } from "@/types";

type TeamInput = Omit<Team, "id" | "createdAt">;

export class InvalidTeamUsersError extends Error {
  constructor() {
    super("INVALID_TEAM_USERS");
  }
}

async function assertUsersExist(userIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(userIds));
  const count = await prisma.user.count({
    where: { id: { in: uniqueIds }, isActive: true },
  });
  if (count !== uniqueIds.length) throw new InvalidTeamUsersError();
}

function includeMembers() {
  return {
    members: {
      orderBy: { createdAt: "asc" as const },
    },
  };
}

export async function getAllTeamsFromDb(): Promise<Team[]> {
  const teams = await prisma.team.findMany({
    include: includeMembers(),
    orderBy: { createdAt: "asc" },
  });
  return teams.map((team) => toTeam(team));
}

export async function createTeamInDb(data: TeamInput): Promise<Team> {
  await assertUsersExist([data.leadUserId, ...data.memberIds]);

  const team = await prisma.team.create({
    data: {
      id: randomUUID(),
      name: data.name,
      leadUserId: data.leadUserId,
      members: {
        create: Array.from(new Set(data.memberIds)).map((userId) => ({ userId })),
      },
    },
    include: includeMembers(),
  });
  return toTeam(team);
}

export async function updateTeamInDb(
  id: string,
  data: Partial<TeamInput>
): Promise<Team | null> {
  if (data.leadUserId || data.memberIds) {
    await assertUsersExist([
      ...(data.leadUserId ? [data.leadUserId] : []),
      ...(data.memberIds ?? []),
    ]);
  }

  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) return null;

  const team = await prisma.$transaction(async (tx) => {
    if (data.memberIds) {
      await tx.teamMember.deleteMany({ where: { teamId: id } });
    }

    return tx.team.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.leadUserId !== undefined ? { leadUserId: data.leadUserId } : {}),
        ...(data.memberIds
          ? {
              members: {
                create: Array.from(new Set(data.memberIds)).map((userId) => ({ userId })),
              },
            }
          : {}),
      },
      include: includeMembers(),
    });
  });

  return toTeam(team);
}

export async function deleteTeamFromDb(id: string): Promise<boolean> {
  const deleted = await prisma.team.deleteMany({
    where: { id },
  });
  return deleted.count > 0;
}
