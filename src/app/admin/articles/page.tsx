"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell, adminToast } from "@/components/admin-shell";
import { useLocale } from "@/components/locale-provider";
import type { Article } from "@/lib/articles";
import clsx from "clsx";

type FormState = {
  id?: number;
  titleEn: string;
  titleHi: string;
  excerptEn: string;
  excerptHi: string;
  bodyEn: string;
  bodyHi: string;
  imageUrl: string;
  published: boolean;
  publishedAt: string;
};

const empty: FormState = {
  titleEn: "",
  titleHi: "",
  excerptEn: "",
  excerptHi: "",
  bodyEn: "",
  bodyHi: "",
  imageUrl: "/articles/rates.svg",
  published: true,
  publishedAt: new Date().toISOString().slice(0, 10),
};

type Tab = "general" | "english" | "hindi" | "seo" | "preview" | "publish";

export default function AdminArticlesPage() {
  const { dict, locale } = useLocale();
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>("general");
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/articles?all=1");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await res.json();
    setArticles(data.articles || []);
  }

  useEffect(() => {
    load();
  }, []);

  const readingTime = useMemo(() => {
    const words = (form.bodyEn || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [form.bodyEn]);

  const charCount = (form.bodyEn || "").length;

  async function save() {
    const payload = {
      titleEn: form.titleEn,
      titleHi: form.titleHi,
      excerptEn: form.excerptEn,
      excerptHi: form.excerptHi,
      bodyEn: form.bodyEn,
      bodyHi: form.bodyHi,
      imageUrl: form.imageUrl || "/articles/rates.svg",
      published: form.published,
      publishedAt: form.publishedAt,
    };

    const res =
      editing && form.id
        ? await fetch("/api/articles", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: form.id, ...payload }),
          })
        : await fetch("/api/articles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

    if (res.ok) {
      adminToast(locale === "hi" ? "लेख सेव हो गया" : "Article saved");
      setLastSaved(new Date().toLocaleTimeString());
      setForm(empty);
      setEditing(false);
      setTab("general");
      load();
    }
  }

  function edit(a: Article) {
    setEditing(true);
    setForm({
      id: a.id,
      titleEn: a.title_en,
      titleHi: a.title_hi,
      excerptEn: a.excerpt_en,
      excerptHi: a.excerpt_hi,
      bodyEn: a.body_en,
      bodyHi: a.body_hi,
      imageUrl: a.image_url || "/articles/rates.svg",
      published: !!a.published,
      publishedAt: a.published_at || new Date().toISOString().slice(0, 10),
    });
    setTab("general");
  }

  async function remove(id: number) {
    if (!confirm(dict.confirmDelete)) return;
    await fetch(`/api/articles?id=${id}`, { method: "DELETE" });
    adminToast("Deleted");
    load();
  }

  async function togglePublish(a: Article) {
    await fetch("/api/articles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, published: !a.published }),
    });
    load();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "english", label: "English" },
    { id: "hindi", label: "Hindi" },
    { id: "seo", label: "SEO" },
    { id: "preview", label: "Preview" },
    { id: "publish", label: "Publish" },
  ];

  return (
    <AdminShell
      title={locale === "hi" ? "लेख" : "Articles"}
      subtitle={lastSaved ? `Last saved ${lastSaved}` : "Tabbed editor · live preview"}
      actions={
        <button type="button" className="ad-btn ad-btn-primary" onClick={save}>
          {dict.save}
        </button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="ad-card overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-[var(--ad-border)] p-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold",
                  tab === t.id
                    ? "bg-[var(--ad-accent-dim)] text-[var(--ad-accent)]"
                    : "text-[var(--ad-muted)] hover:bg-[var(--ad-hover)]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 p-4">
            {tab === "general" && (
              <>
                <label className="block text-xs font-semibold text-[var(--ad-muted)]">
                  Cover image path
                  <input
                    className="ad-input mt-1"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="/articles/rates.svg"
                  />
                </label>
                <p className="text-xs text-[var(--ad-muted)]">
                  Use local paths: /articles/rates.svg · circular.svg · materials.svg
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {["/articles/rates.svg", "/articles/circular.svg", "/articles/materials.svg"].map(
                    (src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setForm({ ...form, imageUrl: src })}
                        className={clsx(
                          "overflow-hidden rounded-lg border",
                          form.imageUrl === src
                            ? "border-[var(--ad-accent)]"
                            : "border-[var(--ad-border)]"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-16 w-full object-cover" />
                      </button>
                    )
                  )}
                </div>
              </>
            )}

            {tab === "english" && (
              <>
                <input
                  className="ad-input"
                  placeholder="Title EN"
                  value={form.titleEn}
                  onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                />
                <textarea
                  className="ad-input"
                  rows={3}
                  placeholder="Excerpt EN"
                  value={form.excerptEn}
                  onChange={(e) => setForm({ ...form, excerptEn: e.target.value })}
                />
                <textarea
                  className="ad-input font-mono text-xs"
                  rows={12}
                  placeholder="Body EN (paragraphs separated by blank lines)"
                  value={form.bodyEn}
                  onChange={(e) => setForm({ ...form, bodyEn: e.target.value })}
                />
                <p className="text-xs text-[var(--ad-muted)]">
                  {charCount} chars · ~{readingTime} min read
                </p>
              </>
            )}

            {tab === "hindi" && (
              <>
                <input
                  className="ad-input"
                  placeholder="Title HI"
                  value={form.titleHi}
                  onChange={(e) => setForm({ ...form, titleHi: e.target.value })}
                />
                <textarea
                  className="ad-input"
                  rows={3}
                  placeholder="Excerpt HI"
                  value={form.excerptHi}
                  onChange={(e) => setForm({ ...form, excerptHi: e.target.value })}
                />
                <textarea
                  className="ad-input"
                  rows={12}
                  placeholder="Body HI"
                  value={form.bodyHi}
                  onChange={(e) => setForm({ ...form, bodyHi: e.target.value })}
                />
              </>
            )}

            {tab === "seo" && (
              <>
                <p className="text-sm text-[var(--ad-muted)]">
                  Slug is generated from English title on create. Keep titles clear and under 70
                  characters for best results.
                </p>
                <input
                  className="ad-input"
                  value={form.titleEn}
                  onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                  placeholder="SEO title (EN)"
                />
                <textarea
                  className="ad-input"
                  rows={3}
                  value={form.excerptEn}
                  onChange={(e) => setForm({ ...form, excerptEn: e.target.value })}
                  placeholder="Meta description (excerpt)"
                />
              </>
            )}

            {tab === "preview" && (
              <div className="rounded-xl border border-[var(--ad-border)] bg-[var(--ad-input)] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl || "/articles/rates.svg"}
                  alt=""
                  className="mb-3 h-36 w-full rounded-lg object-cover"
                />
                <h3 className="font-display text-xl">{form.titleEn || "Untitled"}</h3>
                <p className="mt-2 text-sm text-[var(--ad-muted)]">{form.excerptEn}</p>
                <div className="mt-4 space-y-2 text-sm leading-relaxed">
                  {(form.bodyEn || "")
                    .split(/\n\n+/)
                    .filter(Boolean)
                    .map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                </div>
              </div>
            )}

            {tab === "publish" && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  Published
                </label>
                <label className="block text-xs font-semibold text-[var(--ad-muted)]">
                  Publish date
                  <input
                    type="date"
                    className="ad-input mt-1"
                    value={form.publishedAt}
                    onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" className="ad-btn ad-btn-primary" onClick={save}>
                    {editing ? "Update" : "Create"} & publish
                  </button>
                  {editing && (
                    <button
                      type="button"
                      className="ad-btn ad-btn-ghost"
                      onClick={() => {
                        setEditing(false);
                        setForm(empty);
                      }}
                    >
                      {dict.cancel}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">All articles</h2>
            <Link href="/articles" className="text-xs font-semibold text-[var(--ad-accent)]">
              Public page →
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {articles.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-[var(--ad-border)] px-3 py-2.5"
              >
                <p className="text-sm font-medium">{a.title_en}</p>
                <p className="text-[11px] text-[var(--ad-muted)]">
                  {a.published ? "Published" : "Draft"} · {a.published_at || "—"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="ad-btn ad-btn-ghost !py-1 !text-xs" onClick={() => edit(a)}>
                    {dict.edit}
                  </button>
                  <button
                    type="button"
                    className="ad-btn ad-btn-ghost !py-1 !text-xs"
                    onClick={() => togglePublish(a)}
                  >
                    {a.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    className="ad-btn ad-btn-danger !py-1 !text-xs"
                    onClick={() => remove(a.id)}
                  >
                    {dict.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
