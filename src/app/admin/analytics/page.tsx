import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAnalyticsSummary } from "@/lib/rates";
import { AdminShell } from "@/components/admin-shell";
import { AnalyticsClient } from "@/components/analytics-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics",
};

export default async function AdminAnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const data = getAnalyticsSummary();

  return (
    <AdminShell title="Analytics" subtitle="Trends · comparison · performance">
      <AnalyticsClient data={data} />
    </AdminShell>
  );
}
