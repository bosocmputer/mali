import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { LineBanner } from "@/components/layout/LineBanner";
import { IdleLogout } from "@/components/layout/IdleLogout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    const path = headers().get("x-app-path");
    redirect(path && path !== "/" ? `/login?callbackUrl=${encodeURIComponent(path)}` : "/login");
  }
  // FR-109: nobody uses MALI before setting up their authenticator app
  if (session.user.mfa === "setup") redirect("/setup-2fa");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <LineBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
      <IdleLogout />
    </div>
  );
}
