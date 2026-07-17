"use client";

import { Layers, Clock, TrendingUp, TrendingDown, Package, Activity } from "lucide-react";
import { useLocale } from "./locale-provider";

type Props = {
  totalCategories: number;
  lastUpdated: string | null;
  highest: number | null;
  lowest: number | null;
  materialCount?: number;
  average?: number | null;
};

export function StatsStrip({
  totalCategories,
  lastUpdated,
  highest,
  lowest,
  materialCount,
  average,
}: Props) {
  const { locale, dict } = useLocale();

  const items = [
    {
      label: dict.highestRate,
      value: highest != null ? `₹${highest.toFixed(2)}` : "—",
      icon: TrendingUp,
      hint: locale === "hi" ? "आज" : "Today",
    },
    {
      label: dict.lowestRate,
      value: lowest != null ? `₹${lowest.toFixed(2)}` : "—",
      icon: TrendingDown,
      hint: locale === "hi" ? "आज" : "Today",
    },
    {
      label: dict.totalCategories,
      value: String(totalCategories),
      icon: Layers,
      hint: locale === "hi" ? "सक्रिय" : "Active",
    },
    {
      label: locale === "hi" ? "सामग्री" : "Materials",
      value: materialCount != null ? String(materialCount) : "—",
      icon: Package,
      hint: locale === "hi" ? "अपडेटेड" : "Updated",
    },
    {
      label: locale === "hi" ? "औसत रेट" : "Average Rate",
      value: average != null ? `₹${average.toFixed(2)}` : "—",
      icon: Activity,
      hint: "₹/kg",
    },
    {
      label: dict.lastUpdatedTime,
      value: lastUpdated
        ? new Date(lastUpdated).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—",
      icon: Clock,
      hint: "IST",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item, i) => (
        <div
          key={item.label}
          className="stat-card animate-card"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="relative z-10 flex items-start justify-between gap-2">
            <span className="stat-icon">
              <item.icon size={16} />
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {item.hint}
            </span>
          </div>
          <p className="relative z-10 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--nv-muted)]">
            {item.label}
          </p>
          <p className="relative z-10 mt-1 font-display text-xl text-[var(--nv-text)] sm:text-2xl">
            {item.value}
          </p>
          <div className="relative z-10 mt-3 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#16a34a] to-[#84cc16]"
              style={{ width: `${55 + ((i * 13) % 40)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
