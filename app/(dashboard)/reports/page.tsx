import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ReportsClient } from "@/components/reports/ReportsClient";

/** FR-99, FR-102, FR-108 — supervisor reports with Excel export (FR-103). */
export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERVISOR") redirect("/dashboard");
  return <ReportsClient />;
}
