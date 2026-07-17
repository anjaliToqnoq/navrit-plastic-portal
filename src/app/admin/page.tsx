import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { adminDashboardCounts } from "@/lib/rates";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const stats = adminDashboardCounts();
  return <AdminDashboardClient stats={stats} username={session.username} />;
}
