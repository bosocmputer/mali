import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SetupTwoFactor } from "@/components/auth/SetupTwoFactor";

/** FR-109: first sign-in after 2FA became mandatory, or after a supervisor reset. */
export default async function SetupTwoFactorPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.mfa === "ok") redirect("/dashboard");
  return <SetupTwoFactor email={session.user.email ?? ""} />;
}
