/** Branch code of the head office (สำนักงานใหญ่). */
export const HEAD_OFFICE = "00000";

type BranchInfo = { companyName: string; branchCode?: string | null; branchName?: string | null };

export const isHeadOffice = (c: { branchCode?: string | null }) => !c.branchCode || c.branchCode === HEAD_OFFICE;

/** "สาขา 00001 เชียงใหม่" — empty for the head office. */
export function branchLabel(c: Omit<BranchInfo, "companyName">): string {
  if (isHeadOffice(c)) return "";
  return `สาขา ${c.branchCode}${c.branchName ? ` ${c.branchName}` : ""}`;
}

/**
 * How a company is shown everywhere (FR-92): the name, plus the branch for branch records.
 * Head office records show the plain name, as every company did before branches existed.
 */
export function clientLabel(c: BranchInfo): string {
  const branch = branchLabel(c);
  return branch ? `${c.companyName} (${branch})` : c.companyName;
}
