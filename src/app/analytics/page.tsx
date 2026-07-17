import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Public analytics removed — staff only via /admin/analytics */
export default async function AnalyticsRedirect() {
  const session = await getSession();
  if (session) redirect("/admin/analytics");
  redirect("/admin/login");
}
