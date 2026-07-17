"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, adminToast } from "@/components/admin-shell";
import { useLocale } from "@/components/locale-provider";
import { Pencil, Search } from "lucide-react";
import clsx from "clsx";

type Material = {
  id: number;
  nameEn: string;
  nameHi: string;
  categoryId: number;
  categoryEn: string;
  categoryHi?: string;
  unit: string;
  sortOrder: number;
  active: boolean;
  todayRate: number | null;
};

type Cat = {
  id: number;
  name_en: string;
  name_hi: string;
  active: number;
};

export default function AdminMaterialsPage() {
  const { dict } = useLocale();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [form, setForm] = useState({
    categoryId: 0,
    nameEn: "",
    nameHi: "",
    unit: "₹/kg",
    sortOrder: 0,
    rate: "",
  });
  const [edit, setEdit] = useState<Material | null>(null);
  const [editForm, setEditForm] = useState({
    categoryId: 0,
    nameEn: "",
    nameHi: "",
    unit: "₹/kg",
    sortOrder: 0,
  });

  async function load() {
    const [mRes, cRes] = await Promise.all([
      fetch("/api/admin/materials"),
      fetch("/api/admin/categories"),
    ]);
    if (mRes.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const mData = await mRes.json();
    const cData = await cRes.json();
    setMaterials(mData.materials);
    setCats(cData.categories);
    const active = (cData.categories as Cat[]).filter((c) => c.active);
    if (!form.categoryId && active[0]) {
      setForm((f) => ({ ...f, categoryId: active[0].id }));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live category names always come from JOIN — refresh when tab becomes visible
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCats = useMemo(() => cats.filter((c) => c.active), [cats]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return materials.filter((m) => {
      if (catFilter !== "all" && String(m.categoryId) !== catFilter) return false;
      if (!query) return true;
      return (
        m.nameEn.toLowerCase().includes(query) ||
        m.nameHi.includes(query) ||
        m.categoryEn.toLowerCase().includes(query)
      );
    });
  }, [materials, q, catFilter]);

  async function add() {
    if (!form.nameEn || !form.nameHi || !form.categoryId) {
      adminToast("Category + EN + HI names required");
      return;
    }
    await fetch("/api/admin/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createMaterial",
        ...form,
        rate: form.rate === "" ? undefined : Number(form.rate),
      }),
    });
    setForm((f) => ({ ...f, nameEn: "", nameHi: "", rate: "" }));
    adminToast("Material added");
    load();
  }

  function openEdit(m: Material) {
    setEdit(m);
    setEditForm({
      categoryId: m.categoryId,
      nameEn: m.nameEn,
      nameHi: m.nameHi,
      unit: m.unit,
      sortOrder: m.sortOrder,
    });
  }

  async function saveEdit() {
    if (!edit) return;
    if (!editForm.nameEn || !editForm.nameHi || !editForm.categoryId) {
      adminToast("Category + EN + HI names required");
      return;
    }
    const res = await fetch("/api/admin/materials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: edit.id,
        categoryId: editForm.categoryId,
        nameEn: editForm.nameEn,
        nameHi: editForm.nameHi,
        unit: editForm.unit,
        sortOrder: editForm.sortOrder,
      }),
    });
    if (!res.ok) {
      adminToast("Update failed");
      return;
    }
    adminToast("Material updated — category linked everywhere");
    setEdit(null);
    load();
  }

  async function toggle(m: Material) {
    await fetch("/api/admin/materials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, active: !m.active }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm(dict.confirmDelete)) return;
    await fetch(`/api/admin/materials?id=${id}`, { method: "DELETE" });
    adminToast("Deleted");
    load();
  }

  return (
    <AdminShell
      title={dict.materials}
      subtitle="Linked to Categories by ID — rename a category and it updates Rates, Materials & public site"
    >
      <div className="ad-card mb-4 p-3 text-xs text-[var(--ad-muted)]">
        Materials store a <strong className="text-[var(--ad-text)]">category link</strong>, not a
        copy of the name. Edit category names in Categories — they refresh here, on Rates, exports,
        and the public rate board automatically.
      </div>

      <div className="ad-card mb-4 grid gap-2 p-3 md:grid-cols-3">
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
          className="ad-input"
        >
          {activeCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en}
            </option>
          ))}
        </select>
        <input
          placeholder={dict.nameEn}
          value={form.nameEn}
          onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
          className="ad-input"
        />
        <input
          placeholder={dict.nameHi}
          value={form.nameHi}
          onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
          className="ad-input"
        />
        <input
          type="number"
          placeholder={dict.rate}
          value={form.rate}
          onChange={(e) => setForm({ ...form, rate: e.target.value })}
          className="ad-input"
        />
        <input
          type="number"
          placeholder={dict.displayOrder}
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          className="ad-input"
        />
        <button type="button" onClick={add} className="ad-btn ad-btn-primary">
          {dict.add}
        </button>
      </div>

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
        <button
          type="button"
          onClick={() => setCatFilter("all")}
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            catFilter === "all"
              ? "bg-[var(--ad-accent)] text-[#052e16]"
              : "border border-[var(--ad-border)] text-[var(--ad-muted)]"
          )}
        >
          All
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCatFilter(String(c.id))}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              catFilter === String(c.id)
                ? "bg-[var(--ad-accent)] text-[#052e16]"
                : "border border-[var(--ad-border)] text-[var(--ad-muted)]"
            )}
          >
            {c.name_en}
          </button>
        ))}
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>{dict.plasticName}</th>
              <th>{dict.category}</th>
              <th>{dict.rate}</th>
              <th>{dict.status}</th>
              <th>{dict.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>
                  <p className="font-semibold">{m.nameEn}</p>
                  <p className="text-[11px] text-[var(--ad-muted)]">{m.nameHi}</p>
                </td>
                <td>
                  <span className="ad-badge ad-badge-flat">{m.categoryEn}</span>
                </td>
                <td className="tabular-nums">
                  {m.todayRate != null ? `₹${m.todayRate.toFixed(2)}` : "—"}
                </td>
                <td>
                  <span className={m.active ? "ad-badge ad-badge-up" : "ad-badge ad-badge-flat"}>
                    {m.active ? dict.active : dict.inactive}
                  </span>
                </td>
                <td className="space-x-2">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ad-accent)]"
                  >
                    <Pencil size={12} /> {dict.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(m)}
                    className="text-xs font-semibold text-[var(--ad-muted)]"
                  >
                    {m.active ? dict.inactive : dict.active}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    className="text-xs font-semibold text-[var(--ad-danger)]"
                  >
                    {dict.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="drawer-backdrop" style={{ zIndex: 70 }} onClick={() => setEdit(null)}>
          <aside
            className="drawer-panel !bg-[var(--ad-card)] !text-[var(--ad-text)] p-5"
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 71 }}
          >
            <h2 className="ad-page-title">{dict.edit} material</h2>
            <p className="mt-1 text-xs text-[var(--ad-muted)]">
              Change category here to re-match this material under the correct group.
            </p>
            <div className="mt-5 space-y-3">
              <label className="block text-xs font-semibold text-[var(--ad-muted)]">
                {dict.category}
                <select
                  className="ad-input mt-1"
                  value={editForm.categoryId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, categoryId: Number(e.target.value) })
                  }
                >
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_en}
                      {!c.active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <input
                className="ad-input"
                placeholder={dict.nameEn}
                value={editForm.nameEn}
                onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
              />
              <input
                className="ad-input"
                placeholder={dict.nameHi}
                value={editForm.nameHi}
                onChange={(e) => setEditForm({ ...editForm, nameHi: e.target.value })}
              />
              <input
                className="ad-input"
                placeholder={dict.unit}
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
              />
              <input
                type="number"
                className="ad-input"
                placeholder={dict.displayOrder}
                value={editForm.sortOrder}
                onChange={(e) =>
                  setEditForm({ ...editForm, sortOrder: Number(e.target.value) })
                }
              />
              <button type="button" className="ad-btn ad-btn-primary w-full" onClick={saveEdit}>
                {dict.save}
              </button>
            </div>
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
