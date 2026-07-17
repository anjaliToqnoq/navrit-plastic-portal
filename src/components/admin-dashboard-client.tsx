"use client";

import Link from "next/link";
import { AdminShell } from "./admin-shell";
import { useLocale } from "./locale-provider";
import {
  Package,
  Layers,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  ArrowRight,
  IndianRupee,
} from "lucide-react";

type Stats = {
  todaysEntries: number;
  categoryCount: number;
  materialCount?: number;
  historical: number;
  lastUpdate: string | null;
  monthlyAvg: number;
  todayAvg?: number;
  highest?: { name: string; rate: number } | null;
  lowest?: { name: string; rate: number } | null;
  pendingChanges?: number;
  sparkline?: number[];
  recent?: Array<{ name: string; rate: number; updatedAt: string }>;
};

function Spark({ values }: { values: number[] }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="ad-spark" aria-hidden>
      {values.map((v, i) => (
        <i key={i} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function relativeTime(iso: string | null, locale: string) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === "hi" ? "अभी" : "Just now";
  if (mins < 60) return locale === "hi" ? `${mins} मि पहले` : `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return locale === "hi" ? `${hrs} घं पहले` : `${hrs}h ago`;
  return new Date(iso).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminDashboardClient({
  stats,
  username,
}: {
  stats: Stats;
  username: string;
}) {
  const { dict, locale } = useLocale();
  const spark = stats.sparkline || [];

  const cards = [
    {
      label: "Materials",
      value: String(stats.materialCount ?? stats.todaysEntries),
      sub: `${stats.todaysEntries} rates today`,
      icon: Package,
      spark,
    },
    {
      label: "Avg Rate",
      value: `₹${(stats.todayAvg ?? stats.monthlyAvg).toFixed(2)}`,
      sub: `Monthly ₹${stats.monthlyAvg.toFixed(2)}`,
      icon: Activity,
      spark,
    },
    {
      label: "Last Update",
      value: relativeTime(stats.lastUpdate, locale),
      sub: dict.lastUpdatedTime,
      icon: Clock,
      spark: [],
    },
    {
      label: "Highest",
      value: stats.highest ? `₹${stats.highest.rate.toFixed(2)}` : "—",
      sub: stats.highest?.name || "—",
      icon: TrendingUp,
      spark,
    },
    {
      label: "Lowest",
      value: stats.lowest ? `₹${stats.lowest.rate.toFixed(2)}` : "—",
      sub: stats.lowest?.name || "—",
      icon: TrendingDown,
      spark,
    },
    {
      label: "Pending Δ",
      value: String(stats.pendingChanges ?? 0),
      sub: "vs yesterday",
      icon: Layers,
      spark: [],
    },
  ];

  return (
    <AdminShell
      username={username}
      title="Command Center"
      subtitle={`Today's summary · ${username}`}
      actions={
        <Link href="/admin/rates" className="ad-btn ad-btn-primary">
          <IndianRupee size={14} />
          {dict.updateRates}
        </Link>
      }
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ad-muted)]">
        Today&apos;s Summary
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="ad-card p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--ad-accent-dim)] text-[var(--ad-accent)]">
                <c.icon size={16} />
              </span>
              {c.spark.length > 0 && <Spark values={c.spark} />}
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ad-muted)]">
              {c.label}
            </p>
            <p className="mt-1 font-display text-2xl tracking-tight">{c.value}</p>
            <p className="mt-1 text-xs text-[var(--ad-muted)]">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="ad-card p-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <Link href="/admin/rates" className="text-xs font-semibold text-[var(--ad-accent)]">
              Open rates →
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {(stats.recent || []).length === 0 && (
              <li className="text-sm text-[var(--ad-muted)]">No recent updates</li>
            )}
            {(stats.recent || []).map((r, i) => (
              <li
                key={`${r.name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-[var(--ad-border)] px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-[11px] text-[var(--ad-muted)]">
                    {relativeTime(r.updatedAt, locale)}
                  </p>
                </div>
                <p className="font-semibold tabular-nums">₹{r.rate.toFixed(2)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="ad-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold">Quick Actions</h2>
          <div className="mt-4 grid gap-2">
            {[
              { href: "/admin/rates", label: dict.updateRates },
              { href: "/admin/categories", label: dict.addCategory },
              { href: "/admin/articles", label: dict.navArticles },
              { href: "/admin/analytics", label: dict.navAnalytics },
              { href: "/admin/reports", label: dict.viewReports },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center justify-between rounded-lg border border-[var(--ad-border)] px-3 py-2.5 text-sm transition hover:bg-[var(--ad-hover)]"
              >
                {a.label}
                <ArrowRight size={14} className="text-[var(--ad-muted)]" />
              </Link>
            ))}
          </div>

          <div className="mt-5 rounded-xl bg-[var(--ad-accent-dim)] p-3">
            <p className="text-xs font-semibold text-[var(--ad-accent)]">Price alerts</p>
            <p className="mt-1 text-sm">
              {stats.pendingChanges ?? 0} materials changed vs yesterday
            </p>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
