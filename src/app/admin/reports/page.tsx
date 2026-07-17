"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { useLocale } from "@/components/locale-provider";
import { CalendarDays, Download, FileSpreadsheet, FileText, LineChart } from "lucide-react";
import { format, startOfMonth, subMonths } from "date-fns";

export default function AdminReportsPage() {
  const { dict } = useLocale();
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(now, i));
      return {
        value: format(d, "yyyy-MM"),
        label: format(d, "MMMM yyyy"),
      };
    });
  }, []);

  const [month, setMonth] = useState(monthOptions[0]?.value || format(new Date(), "yyyy-MM"));

  const reports = [
    {
      key: "daily",
      title: dict.dailyReport,
      desc: "All published rates for today",
      updated: today,
      csv: "/api/admin/export?type=daily&format=csv",
      xlsx: "/api/admin/export?type=daily&format=xlsx",
    },
    {
      key: "weekly",
      title: dict.weeklyReport,
      desc: "Last 7 days of rate history",
      updated: today,
      csv: "/api/admin/export?type=weekly&format=csv",
      xlsx: "/api/admin/export?type=weekly&format=xlsx",
    },
  ];

  return (
    <AdminShell
      title={dict.reports}
      subtitle="Export monthly files to your laptop · import later for multi-month analysis"
      actions={
        <Link href="/admin/report-analysis" className="ad-btn ad-btn-primary">
          <LineChart size={14} /> Multi-month analysis
        </Link>
      }
    >
      <div className="ad-card mb-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Monthly export (keep offline)</h2>
            <p className="mt-1 text-sm text-[var(--ad-muted)]">
              Download each month&apos;s CSV/Excel and store on your computer. Server only needs ~30
              days live; older months stay in your files for analysis.
            </p>
          </div>
          <label className="text-xs font-semibold text-[var(--ad-muted)]">
            Month
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="ad-input mt-1 !w-auto min-w-[160px]"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/api/admin/export?type=monthly&format=csv&month=${month}`}
            className="ad-btn ad-btn-primary"
          >
            <Download size={14} /> CSV · {month}
          </a>
          <a
            href={`/api/admin/export?type=monthly&format=xlsx&month=${month}`}
            className="ad-btn ad-btn-ghost"
          >
            <FileText size={14} /> Excel · {month}
          </a>
          <Link href="/admin/report-analysis" className="ad-btn ad-btn-ghost">
            Import & analyze →
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <article key={r.key} className="ad-card flex flex-col p-5">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--ad-accent-dim)] text-[var(--ad-accent)]">
              <FileSpreadsheet size={18} />
            </span>
            <h2 className="mt-4 font-display text-xl">{r.title}</h2>
            <p className="mt-1 flex-1 text-sm text-[var(--ad-muted)]">{r.desc}</p>
            <div className="mt-4 space-y-1 text-xs text-[var(--ad-muted)]">
              <p className="inline-flex items-center gap-1.5">
                <CalendarDays size={12} /> Last generated · {r.updated}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={r.csv} className="ad-btn ad-btn-primary">
                <Download size={14} /> {dict.downloadCsv}
              </a>
              <a href={r.xlsx} className="ad-btn ad-btn-ghost">
                <FileText size={14} /> {dict.downloadExcel}
              </a>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
