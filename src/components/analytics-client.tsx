"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { useMemo, useState } from "react";
import { useLocale } from "./locale-provider";
import { format, subDays } from "date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

export type AnalyticsMaterial = {
  materialId: number;
  nameEn: string;
  nameHi: string;
  categoryEn: string;
  avg: number;
  max: number;
  min: number;
  changePct: number;
  history: Array<{ date: string; rate: number }>;
};

type Props = {
  data: {
    monthStart: string;
    today: string;
    perMaterial: AnalyticsMaterial[];
    best: AnalyticsMaterial | null;
    monthHigh: number;
    monthLow: number;
  };
};

type ChartKind = "line" | "area" | "bar";

export function AnalyticsClient({ data }: Props) {
  const { locale, dict } = useLocale();
  const [materialId, setMaterialId] = useState(data.perMaterial[0]?.materialId ?? 0);
  const [chartKind, setChartKind] = useState<ChartKind>("line");
  const [range, setRange] = useState<"week" | "month" | "custom">("month");
  const [from, setFrom] = useState(data.monthStart);
  const [to, setTo] = useState(data.today);
  const [history, setHistory] = useState(data.perMaterial[0]?.history ?? []);

  const selected = data.perMaterial.find((m) => m.materialId === materialId);

  async function loadHistory(id: number, f: string, t: string) {
    const res = await fetch(`/api/history?materialId=${id}&from=${f}&to=${t}`);
    if (!res.ok) return;
    const json = await res.json();
    setHistory(json.history ?? []);
  }

  function onMaterialChange(id: number) {
    setMaterialId(id);
    const m = data.perMaterial.find((x) => x.materialId === id);
    setHistory(m?.history ?? []);
  }

  function applyRange(next: "week" | "month" | "custom") {
    setRange(next);
    if (next === "week") {
      const f = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const t = data.today;
      setFrom(f);
      setTo(t);
      loadHistory(materialId, f, t);
    } else if (next === "month") {
      setFrom(data.monthStart);
      setTo(data.today);
      loadHistory(materialId, data.monthStart, data.today);
    }
  }

  const chartData = useMemo(() => {
    const labels = history.map((h) => h.date.slice(5));
    const values = history.map((h) => h.rate);
    const color = "rgb(31, 111, 91)";
    return {
      labels,
      datasets: [
        {
          label: selected ? (locale === "hi" ? selected.nameHi : selected.nameEn) : dict.rate,
          data: values,
          borderColor: color,
          backgroundColor: chartKind === "area" ? "rgba(31, 111, 91, 0.22)" : "rgba(31, 111, 91, 0.65)",
          fill: chartKind === "area",
          tension: 0.3,
          pointRadius: 2,
        },
      ],
    };
  }, [history, selected, locale, dict.rate, chartKind]);

  const comparison = useMemo(() => {
    return {
      labels: data.perMaterial.map((m) => (locale === "hi" ? m.nameHi : m.nameEn)),
      datasets: [
        {
          label: dict.avgMonthly,
          data: data.perMaterial.map((m) => m.avg),
          backgroundColor: "rgba(196, 122, 44, 0.75)",
        },
      ],
    };
  }, [data.perMaterial, locale, dict.avgMonthly]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "rgba(12,47,42,0.06)" } },
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={dict.highestRate} value={`₹${data.monthHigh.toFixed(2)}`} />
        <Stat label={dict.lowestRate} value={`₹${data.monthLow.toFixed(2)}`} />
        <Stat
          label={dict.bestPerforming}
          value={
            data.best
              ? `${locale === "hi" ? data.best.nameHi : data.best.nameEn} (${data.best.changePct > 0 ? "+" : ""}${data.best.changePct}%)`
              : "—"
          }
        />
        <Stat label={dict.avgMonthly} value={selected ? `₹${selected.avg.toFixed(2)}` : "—"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {selected && (
          <>
            <Stat
              label={dict.rateIncrease}
              value={selected.changePct >= 0 ? `${selected.changePct}%` : "—"}
            />
            <Stat
              label={dict.rateDecrease}
              value={selected.changePct < 0 ? `${Math.abs(selected.changePct)}%` : "—"}
            />
            <Stat label={`${dict.kg}`} value={`₹${selected.min.toFixed(2)} – ₹${selected.max.toFixed(2)}`} />
          </>
        )}
      </div>

      <section className="ad-card p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <h2 className="text-sm font-semibold">{dict.priceHistory}</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={materialId}
              onChange={(e) => onMaterialChange(Number(e.target.value))}
              className="ad-input !w-auto"
            >
              {data.perMaterial.map((m) => (
                <option key={m.materialId} value={m.materialId}>
                  {locale === "hi" ? m.nameHi : m.nameEn}
                </option>
              ))}
            </select>
            <select
              value={range}
              onChange={(e) => applyRange(e.target.value as typeof range)}
              className="ad-input !w-auto"
            >
              <option value="week">{dict.thisWeek}</option>
              <option value="month">{dict.thisMonth}</option>
              <option value="custom">{dict.custom}</option>
            </select>
            {(["line", "area", "bar"] as ChartKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setChartKind(k)}
                className={
                  chartKind === k ? "ad-btn ad-btn-primary" : "ad-btn ad-btn-ghost"
                }
              >
                {k === "line" ? dict.lineChart : k === "area" ? dict.areaChart : dict.barChart}
              </button>
            ))}
          </div>
        </div>

        {range === "custom" && (
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <label className="text-xs text-[var(--ad-muted)]">
              {dict.from}
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="ad-input mt-1"
              />
            </label>
            <label className="text-xs text-[var(--ad-muted)]">
              {dict.to}
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="ad-input mt-1"
              />
            </label>
            <button
              type="button"
              onClick={() => loadHistory(materialId, from, to)}
              className="ad-btn ad-btn-primary"
            >
              {dict.apply}
            </button>
          </div>
        )}

        <div className="h-72">
          {chartKind === "bar" ? (
            <Bar data={chartData} options={options} />
          ) : (
            <Line data={chartData} options={options} />
          )}
        </div>
      </section>

      <section className="ad-card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold">{dict.materialComparison}</h2>
        <div className="h-72">
          <Bar data={comparison} options={options} />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ad-card px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ad-muted)]">
        {label}
      </p>
      <p className="mt-1 font-display text-lg">{value}</p>
    </div>
  );
}
