import { AdminShell } from "@/components/admin-shell";

export default function ProcessingPage() {
  return (
    <AdminShell title="Processing" subtitle="Processing and manual labour management">
      <div className="rounded-xl border border-[var(--ad-border)] bg-[var(--ad-panel)] p-6">
        <h2 className="text-lg font-semibold">Manual Labour</h2>
        <p className="ad-muted mt-1">Manage workers and record manual labour payments.</p>
        <p className="mt-4 text-sm text-[var(--ad-muted)]">Manual labour management is available here.</p>
      </div>
    </AdminShell>
  );
}
