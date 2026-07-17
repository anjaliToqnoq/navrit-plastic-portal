"use client";

import { useEffect, useState } from "react";
import { AdminShell, adminToast } from "@/components/admin-shell";
import { useLocale } from "@/components/locale-provider";
import type { SiteContent } from "@/lib/content";

const empty: SiteContent = {
  mission: { en: "", hi: "" },
  vision: { en: "", hi: "" },
  why_us: { en: "", hi: "" },
};

export default function AdminContentPage() {
  const { dict } = useLocale();
  const [data, setData] = useState<SiteContent>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (res.ok) adminToast(dict.contentSaved);
  }

  function setField(section: keyof SiteContent, lang: "en" | "hi", value: string) {
    setData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [lang]: value },
    }));
  }

  return (
    <AdminShell
      title={dict.editAbout}
      subtitle={`${dict.mission} · ${dict.vision} · ${dict.whyUs}`}
      actions={
        <button type="button" onClick={save} disabled={saving || loading} className="ad-btn ad-btn-primary">
          {saving ? "Saving…" : dict.save}
        </button>
      }
    >
      {loading ? (
        <div className="space-y-3">
          <div className="ad-skeleton h-40" />
          <div className="ad-skeleton h-40" />
        </div>
      ) : (
        <div className="space-y-4">
          {(
            [
              ["mission", dict.mission],
              ["vision", dict.vision],
              ["why_us", dict.whyUs],
            ] as const
          ).map(([key, title]) => (
            <section key={key} className="ad-card p-4">
              <h2 className="text-sm font-semibold">{title}</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-semibold text-[var(--ad-muted)]">
                  {dict.nameEn}
                  <textarea
                    value={data[key].en}
                    onChange={(e) => setField(key, "en", e.target.value)}
                    rows={5}
                    className="ad-input mt-1"
                  />
                </label>
                <label className="block text-xs font-semibold text-[var(--ad-muted)]">
                  {dict.nameHi}
                  <textarea
                    value={data[key].hi}
                    onChange={(e) => setField(key, "hi", e.target.value)}
                    rows={5}
                    className="ad-input mt-1"
                  />
                </label>
              </div>
            </section>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
