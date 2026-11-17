import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CredentialLogTable } from "@/components/clients/CredentialLogTable";

/** FR-74: supervisors see who viewed, copied or changed government-site passwords. */
export default async function CredentialLogsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERVISOR") redirect("/dashboard");
  return <CredentialLogTable />;
}
