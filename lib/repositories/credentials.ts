import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secretBox";
import { clientLabel } from "@/lib/clientLabel";

export type GovSystem = "RD" | "DBD" | "SSO";
export type CredentialAction = "VIEW" | "COPY" | "CREATE" | "UPDATE" | "DELETE";

export const GOV_SYSTEM_LABEL: Record<GovSystem, string> = {
  RD: "กรมสรรพากร (RD)",
  DBD: "กรมพัฒนาธุรกิจการค้า (DBD)",
  SSO: "ประกันสังคม (SSO)",
};

/** A credential as listed: never the password (NFR-10). */
export interface CredentialSummary {
  id: string;
  system: GovSystem;
  username: string;
  note?: string;
  updatedAt: string;
  updatedByName?: string;
}

type ClientRef = { id: string; taxId?: string | null; companyName: string; branchCode?: string | null; branchName?: string | null };

/** Answer 8: one set per tax id, shared by all its branches; no tax id → this company only. */
const ownerOf = (client: ClientRef) => (client.taxId ? { taxId: client.taxId } : { clientId: client.id });

export async function getClientRef(clientId: string): Promise<ClientRef | null> {
  return prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, taxId: true, companyName: true, branchCode: true, branchName: true },
  });
}

export async function listCredentialsForClient(client: ClientRef): Promise<CredentialSummary[]> {
  const rows = await prisma.govCredential.findMany({
    where: ownerOf(client),
    orderBy: [{ system: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      system: true,
      username: true,
      note: true,
      updatedAt: true,
      updatedBy: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    system: r.system,
    username: r.username,
    ...(r.note ? { note: r.note } : {}),
    updatedAt: r.updatedAt.toISOString(),
    ...(r.updatedBy ? { updatedByName: r.updatedBy.name } : {}),
  }));
}

/** The credential, only if it belongs to this company (or its tax id). */
export async function findCredentialForClient(id: string, client: ClientRef) {
  return prisma.govCredential.findFirst({ where: { id, ...ownerOf(client) } });
}

async function log(
  tx: Pick<typeof prisma, "credentialAccessLog">,
  entry: { credentialId: string; userId: string; action: CredentialAction; system: GovSystem; client: ClientRef; username: string }
) {
  await tx.credentialAccessLog.create({
    data: {
      id: randomUUID(),
      credentialId: entry.credentialId,
      userId: entry.userId,
      action: entry.action,
      system: entry.system,
      companyLabel: clientLabel(entry.client),
      username: entry.username,
    },
  });
}

export async function createCredential(
  client: ClientRef,
  input: { system: GovSystem; username: string; password: string; note?: string | null },
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.govCredential.create({
      data: {
        id: randomUUID(),
        ...ownerOf(client),
        system: input.system,
        username: input.username,
        passwordEnc: encryptSecret(input.password),
        note: input.note || null,
        updatedById: userId,
      },
    });
    await log(tx, { credentialId: row.id, userId, action: "CREATE", system: row.system, client, username: row.username });
  });
}

export async function updateCredential(
  id: string,
  client: ClientRef,
  input: { username?: string; password?: string; note?: string | null },
  userId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.govCredential.update({
      where: { id },
      data: {
        username: input.username,
        ...(input.password ? { passwordEnc: encryptSecret(input.password) } : {}),
        note: input.note === undefined ? undefined : input.note || null,
        updatedById: userId,
      },
    });
    await log(tx, { credentialId: row.id, userId, action: "UPDATE", system: row.system, client, username: row.username });
  });
}

export async function deleteCredential(id: string, client: ClientRef, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.govCredential.findUniqueOrThrow({ where: { id } });
    await log(tx, { credentialId: row.id, userId, action: "DELETE", system: row.system, client, username: row.username });
    await tx.govCredential.delete({ where: { id } });
  });
}

/** FR-72/74: the password for one credential, logged as a view or a copy. */
export async function revealPassword(
  id: string,
  client: ClientRef,
  userId: string,
  action: "VIEW" | "COPY"
): Promise<string> {
  const row = await prisma.govCredential.findUniqueOrThrow({ where: { id } });
  await log(prisma, { credentialId: row.id, userId, action, system: row.system, client, username: row.username });
  return decryptSecret(row.passwordEnc);
}

export interface CredentialLogEntry {
  id: string;
  at: string;
  userName: string;
  action: CredentialAction;
  system: GovSystem;
  companyLabel: string;
  username: string;
}

export async function listCredentialLogs(filters: { search?: string; take?: number } = {}): Promise<CredentialLogEntry[]> {
  const q = filters.search?.trim();
  const rows = await prisma.credentialAccessLog.findMany({
    where: q
      ? {
          OR: [
            { companyLabel: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    orderBy: { at: "desc" },
    take: Math.min(filters.take ?? 300, 1000),
    include: { user: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    at: r.at.toISOString(),
    userName: r.user.name,
    action: r.action,
    system: r.system,
    companyLabel: r.companyLabel,
    username: r.username,
  }));
}
