"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, adminToast } from "@/components/admin-shell";
import { useLocale } from "@/components/locale-provider";
import { Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";

type Cat = {
  id: number;
  name_en: string;
  name_hi: string;
  icon: string | null;
  sort_order: number;
  active: number;
  materialCount?: number;
};

export default function AdminCategoriesPage() {
  const { dict } = useLocale();
  const [cats, setCats] = useState<Cat[]>([]);
  const [nameEn, setNameEn] = useState("");
  const [nameHi, setNameHi] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/admin/categories");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await res.json();
    setCats(data.categories);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return cats.filter((c) => {
      if (!showInactive && !c.active) return false;
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return c.name_en.toLowerCase().includes(query) || c.name_hi.includes(query);
    });
  }, [cats, q, showInactive]);

  function openAdd() {
    setEditId(null);
    setNameEn("");
    setNameHi("");
    setSortOrder(0);
    setDrawer(true);
  }

  function openEdit(c: Cat) {
    setEditId(c.id);
    setNameEn(c.name_en);
    setNameHi(c.name_hi);
    setSortOrder(c.sort_order);
    setDrawer(true);
  }

  function closeDrawer() {
    setDrawer(false);
    setEditId(null);
    setNameEn("");
    setNameHi("");
    setSortOrder(0);
  }

  async function save() {
    if (!nameEn || !nameHi) return;
    if (editId != null) {
      await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, nameEn, nameHi, sortOrder }),
      });
      adminToast("Category updated — name syncs to Materials, Rates & public site");
    } else {
      await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameEn, nameHi, sortOrder, active: true }),
      });
      adminToast("Category added");
    }
    closeDrawer();
    load();
  }

  async function toggle(c: Cat) {
    await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    });
    adminToast(c.active ? "Disabled" : "Enabled");
    load();
  }

  async function remove(id: number) {
    if (!confirm(dict.confirmDelete)) return;
    await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    adminToast("Category removed");
    load();
  }

  return (
    <AdminShell
      title={dict.categories}
      subtitle="Edit names here — Materials, Rates & public pages use the same category link"
      actions={
        <button type="button" className="ad-btn ad-btn-primary" onClick={openAdd}>
          <Plus size={14} /> {dict.addCategory}
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ad-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search categories…"
            className="ad-input !pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--ad-muted)]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <article key={c.id} className="ad-card p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--ad-accent-dim)] text-[var(--ad-accent)]">
                <Layers size={18} />
              </span>
              <span className={c.active ? "ad-badge ad-badge-up" : "ad-badge ad-badge-flat"}>
                {c.active ? dict.active : dict.inactive}
              </span>
            </div>
            <h3 className="mt-3 font-display text-xl">{c.name_en}</h3>
            <p className="text-sm text-[var(--ad-muted)]">{c.name_hi}</p>
            <p className="mt-3 text-xs font-semibold text-[var(--ad-muted)]">
              {c.materialCount ?? 0} materials · order {c.sort_order}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="ad-btn ad-btn-ghost" onClick={() => openEdit(c)}>
                <Pencil size={14} /> {dict.edit}
              </button>
              <button type="button" className="ad-btn ad-btn-ghost" onClick={() => toggle(c)}>
                {c.active ? "Disable" : "Enable"}
              </button>
              <button type="button" className="ad-btn ad-btn-danger" onClick={() => remove(c.id)}>
                <Trash2 size={14} /> {dict.delete}
              </button>
            </div>
          </article>
        ))}
      </div>

      {drawer && (
        <div className="drawer-backdrop" style={{ zIndex: 70 }} onClick={closeDrawer}>
          <aside
            className="drawer-panel !bg-[var(--ad-card)] !text-[var(--ad-text)] p-5"
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 71 }}
          >
            <h2 className="ad-page-title">
              {editId != null ? dict.edit : dict.addCategory}
            </h2>
            <div className="mt-5 space-y-3">
              <input
                className="ad-input"
                placeholder={dict.nameEn}
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
              <input
                className="ad-input"
                placeholder={dict.nameHi}
                value={nameHi}
                onChange={(e) => setNameHi(e.target.value)}
              />
              <input
                type="number"
                className="ad-input"
                placeholder={dict.displayOrder}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
              <button type="button" className="ad-btn ad-btn-primary w-full" onClick={save}>
                {dict.save}
              </button>
            </div>
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
