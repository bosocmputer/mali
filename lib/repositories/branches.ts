import { prisma } from "@/lib/db";

/** Tax ids used by more than one company record, i.e. companies that have branches. */
export async function getMultiBranchTaxIds(): Promise<Set<string>> {
  const groups = await prisma.client.groupBy({
    by: ["taxId"],
    where: { taxId: { not: null } },
    _count: { _all: true },
  });
  return new Set(groups.filter((g) => g._count._all > 1).map((g) => g.taxId as string));
}

/** Set `hasBranches` so head-office records of such companies are labelled too. */
export function markBranches<T extends { taxId?: string | null; hasBranches?: boolean }>(clients: T[], multi: Set<string>): T[] {
  for (const c of clients) c.hasBranches = !!c.taxId && multi.has(c.taxId);
  return clients;
}
