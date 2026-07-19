"use client";

import { HomeHero } from "@/components/home-hero";
import { InnovateSection } from "@/components/innovate-section";
import { DiscoverSection } from "@/components/discover-section";
import { RateTable } from "@/components/rate-table";
import { StatsStrip } from "@/components/stats-strip";
import { useLocale } from "@/components/locale-provider";
import type { TodayRateRow } from "@/lib/rates";
import type { Article } from "@/lib/articles";

type Props = {
  date: string;
  ratesAsOf?: string;
  rows: TodayRateRow[];
  stats: {
    totalCategories: number;
    lastUpdated: string | null;
    highest: number | null;
    lowest: number | null;
  };
  articles: Article[];
};

export function HomePageClient({ date, ratesAsOf, rows, stats, articles }: Props) {
  const { dict } = useLocale();
  const average =
    rows.length > 0 ? rows.reduce((s, r) => s + r.rate, 0) / rows.length : null;
  const boardDate = ratesAsOf || date;

  return (
    <>
      <HomeHero date={date} rows={rows} stats={stats} ratesAsOf={ratesAsOf} />

      <div id="rates" className="scroll-mt-28">
        <div className="container-premium space-y-8 py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16a34a]">
                Live board
              </p>
              <h2 className="mt-2 font-display text-3xl text-[var(--nv-text)] sm:text-4xl">
                {dict.todaysRates}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-[var(--nv-muted)]">{dict.tagline}</p>
            </div>
          </div>

          <StatsStrip
            totalCategories={stats.totalCategories}
            lastUpdated={stats.lastUpdated}
            highest={stats.highest}
            lowest={stats.lowest}
            materialCount={rows.length}
            average={average}
          />
          <RateTable rows={rows} date={boardDate} lastUpdated={stats.lastUpdated} />
        </div>
      </div>

      <InnovateSection />
      {articles.length > 0 && <DiscoverSection articles={articles} />}
    </>
  );
}
