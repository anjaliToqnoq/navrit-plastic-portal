"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, adminToast } from "@/components/admin-shell";
import { Download, HardDrive, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";

type BackupRow = {
  filename: string;
  size: number;
  sizeLabel: string;
  createdAt: string;
  checksum: string;
};

export default function AdminBackupPage() {
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/backup");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await res.json();
    setBackups(data.backups || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/admin/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "admin" }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) {
      adminToast(data.error || "Backup failed");
      return;
    }
    adminToast(`Backup saved · ${data.backup.filename}`);
    load();
  }

  async function restore(filename: string) {
    if (
      !confirm(
        `Restore ${filename}?\n\nThis replaces the live database. A safety backup of the current DB is created first. Restart the server after restore.`
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", filename }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) {
      adminToast(data.error || "Restore failed");
      return;
    }
    adminToast("Restored. Restart the app to reload connections.");
    load();
  }

  return (
    <AdminShell
      title="Backup & Recovery"
      subtitle="Safe SQLite snapshots before upgrades · SHA-256 verified"
      actions={
        <>
          <button type="button" className="ad-btn ad-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="ad-btn ad-btn-primary" onClick={create} disabled={busy}>
            <HardDrive size={14} /> {busy ? "Working…" : "Create backup now"}
          </button>
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="ad-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ad-muted)]">
            Storage
          </p>
          <p className="mt-1 text-sm">data/backups/</p>
          <p className="mt-1 text-xs text-[var(--ad-muted)]">Not public · not in git</p>
        </div>
        <div className="ad-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ad-muted)]">
            Method
          </p>
          <p className="mt-1 text-sm">SQLite VACUUM INTO</p>
          <p className="mt-1 text-xs text-[var(--ad-muted)]">Consistent live snapshot</p>
        </div>
        <div className="ad-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ad-muted)]">
            Retention
          </p>
          <p className="mt-1 text-sm">Last 30 backups</p>
          <p className="mt-1 text-xs text-[var(--ad-muted)]">Older files auto-pruned</p>
        </div>
      </div>

      <div className="ad-card mb-4 p-4 text-sm text-[var(--ad-muted)]">
        <p className="inline-flex items-center gap-2 font-semibold text-[var(--ad-text)]">
          <ShieldCheck size={16} className="text-[var(--ad-accent)]" />
          Before every upgrade
        </p>
        <p className="mt-2">
          Run <code className="text-[var(--ad-accent)]">npm run deploy:safe</code> on the server
          (backs up → installs → builds), then restart. Or click{" "}
          <strong className="text-[var(--ad-text)]">Create backup now</strong> and download a copy
          to your laptop.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="ad-skeleton h-12" />
          <div className="ad-skeleton h-12" />
        </div>
      ) : backups.length === 0 ? (
        <div className="ad-card p-8 text-center text-sm text-[var(--ad-muted)]">
          No backups yet. Create your first snapshot before deploying a new version.
        </div>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Created</th>
                <th>Checksum</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.filename}>
                  <td className="font-mono text-xs">{b.filename}</td>
                  <td>{b.sizeLabel}</td>
                  <td className="text-[var(--ad-muted)]">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="font-mono text-[10px] text-[var(--ad-muted)]">
                    {b.checksum.slice(0, 16)}…
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/admin/backup?download=${encodeURIComponent(b.filename)}`}
                        className="ad-btn ad-btn-ghost !py-1 !text-xs"
                      >
                        <Download size={12} /> Download
                      </a>
                      <button
                        type="button"
                        className="ad-btn ad-btn-danger !py-1 !text-xs"
                        disabled={busy}
                        onClick={() => restore(b.filename)}
                      >
                        <RotateCcw size={12} /> Restore
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
