"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminShell, adminToast } from "@/components/admin-shell";
import { useLocale } from "@/components/locale-provider";
import { Copy, Save, Search, Undo2 } from "lucide-react";
import clsx from "clsx";

type MaterialRow = {
  id: number;
  nameEn: string;
  nameHi: string;
  categoryId: number;
  categoryEn: string;
  unit: string;
  active: boolean;
  todayRate: number | null;
  yesterdayRate: number | null;
  updatedAt: string | null;
};

type Density = "compact" | "comfortable" | "spacious";

export default function AdminRatesPage() {
  const { dict, locale } = useLocale();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [date, setDate] = useState("");
  const [rates, setRates] = useState<Record<number, string>>({});
  const [baseline, setBaseline] = useState<Record<number, string>>({});
  const [history, setHistory] = useState<Record<number, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [density, setDensity] = useState<Density>("comfortable");
  const [bulkAmt, setBulkAmt] = useState("1");
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/materials");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await res.json();
    setDate(data.date);
    setMaterials(data.materials);
    const map: Record<number, string> = {};
    data.materials.forEach((m: MaterialRow) => {
      map[m.id] = m.todayRate != null ? String(m.todayRate) : "";
    });
    setRates(map);
    setBaseline(map);
    setHistory([]);
    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const map = new Map<number, string>();
    materials.forEach((m) => map.set(m.categoryId, m.categoryEn));
    return [...map.entries()];
  }, [materials]);

  const active = useMemo(
    () =>
      materials.filter((m) => {
        if (!m.active) return false;
        if (category !== "all" && String(m.categoryId) !== category) return false;
        const query = q.trim().toLowerCase();
        if (!query) return true;
        return (
          m.nameEn.toLowerCase().includes(query) ||
          m.nameHi.includes(query) ||
          m.categoryEn.toLowerCase().includes(query)
        );
      }),
    [materials, q, category]
  );

  const dirtyCount = useMemo(() => {
    return Object.keys(rates).filter((id) => rates[Number(id)] !== baseline[Number(id)]).length;
  }, [rates, baseline]);

  function pushHistory(next: Record<number, string>) {
    setHistory((h) => [...h.slice(-19), rates]);
    setRates(next);
  }

  function undo() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setRates(prev);
    adminToast("Undone");
  }

  function setRate(id: number, value: string) {
    pushHistory({ ...rates, [id]: value });
  }

  function applyBulk(mode: "add" | "pct" | "round") {
    const ids = selected.size ? [...selected] : active.map((m) => m.id);
    const next = { ...rates };
    const amt = Number(bulkAmt) || 0;
    for (const id of ids) {
      const cur = Number(next[id]);
      if (Number.isNaN(cur) && mode !== "round") continue;
      if (mode === "add") next[id] = (cur + amt).toFixed(2);
      if (mode === "pct") next[id] = (cur * (1 + amt / 100)).toFixed(2);
      if (mode === "round") next[id] = Number(next[id] || 0).toFixed(0);
    }
    pushHistory(next);
    adminToast(`Bulk applied to ${ids.length} rows`);
  }

  async function save() {
    setSaving(true);
    const payload = Object.entries(rates)
      .filter(([, v]) => v !== "")
      .map(([id, v]) => ({ materialId: Number(id), rate: Number(v) }));
    const res = await fetch("/api/admin/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rates: payload, date }),
    });
    setSaving(false);
    if (res.ok) {
      adminToast(dict.ratesUpdated);
      load();
    }
  }

  async function duplicate() {
    const res = await fetch("/api/admin/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate", date }),
    });
    const data = await res.json();
    if (res.ok) {
      adminToast(`${dict.duplicateYesterday}: ${data.count}`);
      load();
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates, date]);

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(active.map((m) => m.id)) : new Set());
  }

  return (
    <AdminShell
      title={dict.updateRates}
      subtitle={`${date} · Ctrl/Cmd+S to save · ${dirtyCount} unsaved`}
      actions={
        <>
          <button type="button" className="ad-btn ad-btn-ghost" onClick={undo} disabled={!history.length}>
            <Undo2 size={14} /> Undo
          </button>
          <button type="button" className="ad-btn ad-btn-ghost" onClick={duplicate}>
            <Copy size={14} /> {dict.duplicateYesterday}
          </button>
          <button type="button" className="ad-btn ad-btn-primary" onClick={save} disabled={saving}>
            <Save size={14} /> {saving ? "Saving…" : "Publish"}
          </button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ad-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={dict.searchPlaceholder}
            className="ad-input !pl-8"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Chip>
          {categories.map(([id, name]) => (
            <Chip key={id} active={category === String(id)} onClick={() => setCategory(String(id))}>
              {name}
            </Chip>
          ))}
        </div>
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value as Density)}
          className="ad-input !w-auto"
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </select>
      </div>

      <div className="ad-card mb-3 flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-semibold text-[var(--ad-muted)]">Bulk edit</span>
        <input
          value={bulkAmt}
          onChange={(e) => setBulkAmt(e.target.value)}
          className="ad-input !w-20"
          type="number"
          step="0.1"
        />
        <button type="button" className="ad-btn ad-btn-ghost" onClick={() => applyBulk("add")}>
          ± ₹ amount
        </button>
        <button type="button" className="ad-btn ad-btn-ghost" onClick={() => applyBulk("pct")}>
          ± % 
        </button>
        <button type="button" className="ad-btn ad-btn-ghost" onClick={() => applyBulk("round")}>
          Round
        </button>
        <span className="text-xs text-[var(--ad-muted)]">
          {selected.size ? `${selected.size} selected` : "Applies to filtered rows if none selected"}
        </span>
        {dirtyCount > 0 && (
          <span className="ad-badge ml-auto" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
            {dirtyCount} unsaved
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="ad-skeleton h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="ad-table-wrap">
          <table className={clsx("ad-table", density)}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={active.length > 0 && selected.size === active.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th>{dict.plasticName}</th>
                <th>{dict.category}</th>
                <th>Yesterday</th>
                <th>Today</th>
                <th>Δ</th>
                <th>%</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {active.map((m) => {
                const today = rates[m.id] === "" ? null : Number(rates[m.id]);
                const y = m.yesterdayRate;
                const diff =
                  today != null && y != null && !Number.isNaN(today) ? today - y : null;
                const pct =
                  diff != null && y != null && y !== 0 ? (diff / y) * 100 : null;
                const dirty = rates[m.id] !== baseline[m.id];
                return (
                  <tr key={m.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(m.id)}
                        onChange={(e) => {
                          setSelected((s) => {
                            const n = new Set(s);
                            if (e.target.checked) n.add(m.id);
                            else n.delete(m.id);
                            return n;
                          });
                        }}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-md bg-[var(--ad-accent-dim)] text-[10px] font-bold text-[var(--ad-accent)]">
                          {m.nameEn.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold">
                            {locale === "hi" ? m.nameHi : m.nameEn}
                          </p>
                          <p className="text-[10px] text-[var(--ad-muted)]">
                            {locale === "hi" ? m.nameEn : m.nameHi}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="ad-badge ad-badge-flat">{m.categoryEn}</span>
                    </td>
                    <td className="tabular-nums text-[var(--ad-muted)]">
                      {y != null ? `₹${y.toFixed(2)}` : "—"}
                    </td>
                    <td>
                      <input
                        ref={(el) => {
                          inputRefs.current[m.id] = el;
                        }}
                        type="number"
                        step="0.01"
                        value={rates[m.id] ?? ""}
                        onChange={(e) => setRate(m.id, e.target.value)}
                        className={clsx("ad-rate-input", dirty && "dirty")}
                      />
                    </td>
                    <td className="tabular-nums">
                      {diff == null ? (
                        "—"
                      ) : (
                        <span className={diff > 0 ? "text-[var(--ad-success)]" : diff < 0 ? "text-[var(--ad-danger)]" : ""}>
                          {diff > 0 ? "+" : ""}
                          {diff.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums">
                      {pct == null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}
                    </td>
                    <td>
                      {diff == null || diff === 0 ? (
                        <span className="ad-badge ad-badge-flat">No change</span>
                      ) : diff > 0 ? (
                        <span className="ad-badge ad-badge-up">↑ Increased</span>
                      ) : (
                        <span className="ad-badge ad-badge-down">↓ Decreased</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
        active
          ? "bg-[var(--ad-accent)] text-[#052e16]"
          : "border border-[var(--ad-border)] text-[var(--ad-muted)] hover:bg-[var(--ad-hover)]"
      )}
    >
      {children}
    </button>
  );
}
