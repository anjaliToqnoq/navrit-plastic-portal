import { HomePageClient } from "@/components/home-page-client";
import { getPublicRates, getStats } from "@/lib/rates";
import { listPublishedArticles, serializeArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const { date, rows } = getPublicRates();
  const stats = getStats(rows);
  const articles = serializeArticles(listPublishedArticles(3));

  return <HomePageClient date={date} rows={rows} stats={stats} articles={articles} />;
}
