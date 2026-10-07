"use client";

import { AdminShell } from "@/components/admin-shell";

export default function AccountsPage() {
  return (
    <AdminShell
      title="Accounts & Finance"
      subtitle="Finance workspace for PET and Plastic. Detailed finance workflows will be added here."
    >
      <div className="ad-card p-6">
        <h2 className="text-lg font-semibold">Accounts & Finance</h2>
        <p className="ad-muted mt-2 text-sm">
          This section is ready for the finance views and reports. Existing
          inventory, sales, expenses, purchases and opening-balance workflows
          remain unchanged.
        </p>
      </div>
    </AdminShell>
  );
}
