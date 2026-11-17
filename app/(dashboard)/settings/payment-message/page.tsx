import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PaymentSettingsForm } from "@/components/payments/PaymentSettingsForm";

/** FR-100: supervisors edit the transfer details used in payment messages. */
export default async function PaymentMessageSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERVISOR") redirect("/dashboard");
  return <PaymentSettingsForm />;
}
