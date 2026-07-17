"use client";

import { useMemo, useState } from "react";
import { AdminShell, adminToast } from "@/components/admin-shell";
import {
  compareMaterials,
  detectMonthLabel,
  monthAvgSeries,
  rowsFromSheetObjects,
  summarizeMonth,
  type MonthReport,
} from "@/lib/report-analysis";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { FileUp, Trash2, Upload } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const MAX_SLOTS = 3;

type Slot = MonthReport | null;

async function parseFile(file: File): Promise<MonthReport> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const objects = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const rows = rowsFromSheetObjects(objects);
  if (!rows.length) {
    throw new Error("No valid rate rows found. Use a monthly CSV/Excel export from Reports.");
  }
  const label = detectMonthLabel(rows, file.name);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    fileName: file.name,
    rows,
    loadedAt: new Date().toISOString(),
  };
}

export default function ReportAnalysisPage() {
  const [slots, setSlots] = useState<Slot[]>([null, null, null]);
  const [busy, setBusy] = useState(false);

  const reports = useMemo(() => slots.filter(Boolean) as MonthReport[], [slots]);
  const summaries = useMemo(() => reports.map(summarizeMonth), [reports]);
  const materialRows = useMemo(() => compareMaterials(reports), [reports]);
  const series = useMemo(() => monthAvgSeries(reports), [reports]);

  async function onFile(index: number, file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const report = await parseFile(file);
      setSlots((prev) => {
        const next = [...prev];
        // Avoid duplicate month labels silently renaming
        const clash = next.some((s, i) => s && i !== index && s.label === report.label);
        if (clash) report.label = `${report.label} (${index + 1})`;
        next[index] = report;
        return next;
      });
      adminToast(`Loaded ${report.label} · ${report.rows.length} rows`);
    } catch (e) {
      adminToast(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function clearSlot(index: number) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }

  function clearAll() {
    setSlots([null, null, null]);
  }

  const chartColors = ["#22c55e", "#84cc16", "#38bdf8"];

  const avgChart = {
    labels: series.map((s) => s.label),
    datasets: [
      {
        label: "Avg rate ₹/kg",
        data: series.map((s) => s.avg),
        backgroundColor: chartColors,
        borderRadius: 8,
      },
    ],
  };

  const materialChart = {
    labels: materialRows.slice(0, 12).map((m) => m.materialEn),
    datasets: reports.map((r, i) => ({
      label: r.label,
      data: materialRows.slice(0, 12).map((m) => m.months[r.label] ?? null),
      borderColor: chartColors[i % chartColors.length],
      backgroundColor: chartColors[i % chartColors.length] + "33",
      tension: 0.3,
      fill: false,
    })),
  };

  return (
    <AdminShell
      title="Multi-month analysis"
      subtitle="Import up to 3 monthly exports · analyzed in browser · nothing saved on server"
      actions={
        reports.length > 0 ? (
          <button type="button" className="ad-btn ad-btn-ghost" onClick={clearAll}>
            <Trash2 size={14} /> Clear all
          </button>
        ) : null
      }
    >
      <div className="ad-card mb-4 p-4 text-sm text-[var(--ad-muted)]">
        <p className="font-semibold text-[var(--ad-text)]">How to use</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Each month: Reports → Monthly → download CSV/Excel (keep file on your laptop).</li>
          <li>When you want analysis: import 2–3 monthly files below.</li>
          <li>Compare averages, highs/lows, and material trends. Clear when done — server stays light.</li>
        </ol>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {slots.map((slot, i) => (
          <div key={i} className="ad-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--ad-muted)]">
                Month slot {i + 1}
              </p>
              {slot && (
                <button type="button" className="text-xs text-[var(--ad-danger)]" onClick={() => clearSlot(i)}>
                  Remove
                </button>
              )}
            </div>

            {slot ? (
              <div className="mt-3">
                <p className="font-display text-2xl text-[var(--ad-accent)]">{slot.label}</p>
                <p className="mt-1 truncate text-xs text-[var(--ad-muted)]">{slot.fileName}</p>
                <p className="mt-2 text-sm">
                  {slot.rows.length} rows · {new Set(slot.rows.map((r) => r.date)).size} days
                </p>
              </div>
            ) : (
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ad-border)] bg-[var(--ad-input)] px-3 py-8 text-center transition hover:border-[var(--ad-accent)]">
                <Upload size={20} className="text-[var(--ad-accent)]" />
                <span className="mt-2 text-sm font-semibold">Import CSV / Excel</span>
                <span className="mt-1 text-[11px] text-[var(--ad-muted)]">Monthly export file</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => onFile(i, e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="ad-card flex flex-col items-center gap-2 p-10 text-center text-[var(--ad-muted)]">
          <FileUp size={28} className="text-[var(--ad-accent)]" />
          <p>Import at least one monthly report to see analysis.</p>
          <p className="text-xs">Max {MAX_SLOTS} months at a time.</p>
        </div>
      )}

      {reports.length > 0 && (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ad-muted)]">
            Month summaries
          </p>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((s) => (
              <div key={s.label} className="ad-card p-4">
                <p className="text-xs font-bold text-[var(--ad-accent)]">{s.label}</p>
                <p className="mt-2 font-display text-3xl">₹{s.avgRate.toFixed(2)}</p>
                <p className="text-xs text-[var(--ad-muted)]">Average rate</p>
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--ad-muted)]">Highest</dt>
                    <dd>
                      {s.highMaterial} · ₹{s.highRate.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--ad-muted)]">Lowest</dt>
                    <dd>
                      {s.lowMaterial} · ₹{s.lowRate.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--ad-muted)]">Materials / days</dt>
                    <dd>
                      {s.materialCount} / {s.dayCount}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {reports.length >= 2 && (
            <div className="mb-4 ad-card p-4">
              <p className="text-sm font-semibold">Cross-month insight</p>
              <p className="mt-2 text-sm text-[var(--ad-muted)]">
                {(() => {
                  const sorted = [...summaries].sort((a, b) => a.avgRate - b.avgRate);
                  const low = sorted[0];
                  const high = sorted[sorted.length - 1];
                  const delta = high.avgRate - low.avgRate;
                  const pct = low.avgRate ? ((delta / low.avgRate) * 100).toFixed(1) : "0";
                  return `Strongest month ${high.label} (₹${high.avgRate}) vs softest ${low.label} (₹${low.avgRate}) — difference ₹${delta.toFixed(2)} (${pct}%).`;
                })()}
              </p>
            </div>
          )}

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="ad-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Average rate by month</h2>
              <div className="h-56">
                <Bar
                  data={avgChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.1)" } },
                      y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.1)" } },
                    },
                  }}
                />
              </div>
            </div>
            <div className="ad-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Material avg (top 12)</h2>
              <div className="h-56">
                <Line
                  data={materialChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: "#94a3b8", boxWidth: 12 } } },
                    scales: {
                      x: { ticks: { color: "#94a3b8", maxRotation: 45 }, grid: { display: false } },
                      y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.1)" } },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Category</th>
                  {reports.map((r) => (
                    <th key={r.label}>{r.label} avg</th>
                  ))}
                  {reports.length >= 2 && <th>Δ first→last</th>}
                </tr>
              </thead>
              <tbody>
                {materialRows.map((m) => {
                  const vals = reports.map((r) => m.months[r.label]);
                  const first = vals[0];
                  const last = vals[vals.length - 1];
                  const delta =
                    first != null && last != null ? Math.round((last - first) * 100) / 100 : null;
                  return (
                    <tr key={m.materialEn}>
                      <td className="font-semibold">{m.materialEn}</td>
                      <td className="text-[var(--ad-muted)]">{m.categoryEn || "—"}</td>
                      {reports.map((r) => (
                        <td key={r.label} className="tabular-nums">
                          {m.months[r.label] != null ? `₹${m.months[r.label]!.toFixed(2)}` : "—"}
                        </td>
                      ))}
                      {reports.length >= 2 && (
                        <td
                          className={
                            delta == null
                              ? ""
                              : delta > 0
                                ? "text-[var(--ad-success)]"
                                : delta < 0
                                  ? "text-[var(--ad-danger)]"
                                  : "text-[var(--ad-muted)]"
                          }
                        >
                          {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}
