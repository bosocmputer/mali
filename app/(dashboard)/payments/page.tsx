import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PaymentsClient } from "@/components/payments/PaymentsClient";

/** FR-80: what the supervisor still has to pay to the government. */
export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERVISOR") redirect("/dashboard");
  return <PaymentsClient />;
}
