"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useBusinessMode } from "@/components/business-mode-provider";
import { ACCOUNT_PERSONS, type AccountPerson } from "@/lib/account-persons";
import { PersonSelect } from "@/components/person-select";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, WalletCards } from "lucide-react";

type Person = AccountPerson;
type Row = Record<string, unknown>;
type PersonTotals = {
  received: number;
  purchasesPaid: number;
  expensesPaid: number;
  processingPaid: number;
  saleProcessingPaid: number;
  labourPaid?: number;
  companyPaid?: number;
  ownPocketPaid?: number;
  settled?: number;
  cashWithPartner?: number;
  companyOwesPartner?: number;
  paid: number;
  balance: number;
};
type Reconciliation = {
  companyBook: number;
  cashWithPartners: number;
  dueToPartners: number;
  externalLoanOutstanding: number;
};
type AccountsData = {
  openingBalance?: Record<string, number>;
  personAccountTotals?: Record<string, Record<string, PersonTotals>>;
  cashBalance?: Record<string, number>;
  reconciliation?: Record<string, Reconciliation>;
  externalLoanOutstanding?: Record<string, number>;
  partnerSettlements?: Row[];
  salePayments?: Row[];
  purchases?: Row[];
  vendorPayments?: Row[];
  otherExpenses?: Row[];
  processingExpenses?: Row[];
  saleProcessingCosts?: Row[];
  manualLabour?: Row[];
};

const people: Person[] = [...ACCOUNT_PERSONS];

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sumBy(rows: Row[] | undefined, field: string, person: Person, mode: string, amountField = "amount") {
  return (rows || [])
    .filter((row) => row.mode === mode && String(row[field] || "") === person)
    .reduce((total, row) => total + Number(row[amountField] ?? row.amount ?? 0), 0);
}

export default function AccountsPage() {
  const { mode } = useBusinessMode();
  const [data, setData] = useState<AccountsData | null>(null);
  const [opening, setOpening] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settle, setSettle] = useState({ person: "" as string, amount: "", settlementDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [settleBusy, setSettleBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load accounts");
      setData(json);
      setOpening(String(Number(json.openingBalance?.[mode] || 0)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveOpeningBalance() {
    const amount = Number(opening);
    if (!Number.isFinite(amount) || amount < 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setOpeningBalance", mode, amount }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Failed to save opening balance");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function settlePartner() {
    const amount = Number(settle.amount);
    if (!settle.person || !(amount > 0)) {
      setMessage("Choose a partner and enter a settlement amount");
      return;
    }
    setSettleBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settlePartner",
          mode,
          person: settle.person,
          amount,
          settlementDate: settle.settlementDate,
          notes: settle.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Settlement failed");
      setSettle({ person: "", amount: "", settlementDate: new Date().toISOString().slice(0, 10), notes: "" });
      setMessage("Partner settlement saved");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Settlement failed");
    } finally {
      setSettleBusy(false);
    }
  }

  const companyBalance = Number(data?.cashBalance?.[mode] || 0);
  const openingBalance = Number(data?.openingBalance?.[mode] || 0);
  const recon = data?.reconciliation?.[mode];
  const externalLoans = Number(data?.externalLoanOutstanding?.[mode] || recon?.externalLoanOutstanding || 0);

  const accounts = useMemo(() => {
    return people.map((person) => {
      const serverTotals = data?.personAccountTotals?.[mode]?.[person];
      if (serverTotals) {
        return {
          person,
          received: Number(serverTotals.received || 0),
          paid: Number(serverTotals.paid || 0),
          balance: Number(serverTotals.balance || 0),
          purchasesPaid: Number(serverTotals.purchasesPaid || 0),
          expensesPaid:
            Number(serverTotals.expensesPaid || 0) +
            Number(serverTotals.processingPaid || 0) +
            Number(serverTotals.saleProcessingPaid || 0) +
            Number(serverTotals.labourPaid || 0),
          companyPaid: Number(serverTotals.companyPaid || 0),
          ownPocketPaid: Number(serverTotals.ownPocketPaid || 0),
          settled: Number(serverTotals.settled || 0),
          cashWithPartner: Number(serverTotals.cashWithPartner ?? serverTotals.balance ?? 0),
          companyOwesPartner: Number(serverTotals.companyOwesPartner || 0),
        };
      }

      const received = sumBy(data?.salePayments, "received_by", person, mode);
      const purchasesPaid = (data?.vendorPayments || [])
        .filter((row) =>
          row.mode === mode &&
          String(row.paid_by || "") === person &&
          String(row.payment_type || "") !== "ADVANCE" &&
          String(row.payment_mode || "") !== "Advance"
        )
        .reduce((total, row) => total + Number(row.amount ?? 0), 0);
      const expensesPaid = sumBy(data?.otherExpenses, "paid_by", person, mode);
      const processingPaid = sumBy(data?.processingExpenses, "paid_by", person, mode);
      const saleProcessingPaid = (data?.saleProcessingCosts || [])
        .filter((row) => row.mode === mode && String(row.paid_by || "") === person)
        .reduce((total, row) => total + Number(row.labour_cost || 0) + Number(row.loading_cost || 0), 0);
      const labourPaid = sumBy(data?.manualLabour, "paid_by", person, mode);
      const paid = purchasesPaid + expensesPaid + processingPaid + saleProcessingPaid + labourPaid;
      const cashWithPartner = received - paid;
      return {
        person,
        received,
        paid,
        balance: cashWithPartner,
        purchasesPaid,
        expensesPaid: expensesPaid + processingPaid + saleProcessingPaid + labourPaid,
        companyPaid: paid,
        ownPocketPaid: 0,
        settled: 0,
        cashWithPartner,
        companyOwesPartner: 0,
      };
    });
  }, [data, mode]);

  const transactions = useMemo(() => {
    const rows: Array<{ date: string; type: string; description: string; person: string; amount: number; direction: "in" | "out"; funding?: string }> = [];

    (data?.salePayments || [])
      .filter((x) => x.mode === mode && x.received_by)
      .forEach((x) => rows.push({
        date: String(x.payment_date ?? ""),
        type: "Sale receipt",
        description: x.customerName ? `Sale from ${x.customerName}` : `Sale #${x.sale_id}`,
        person: String(x.received_by ?? ""),
        amount: Number(x.amount || 0),
        direction: "in",
      }));

    (data?.vendorPayments || [])
      .filter((x) => x.mode === mode && x.paid_by && String(x.payment_type || "") !== "ADVANCE" && String(x.payment_mode || "") !== "Advance" && Number(x.amount) > 0)
      .forEach((x) => rows.push({
        date: String(x.payment_date ?? ""),
        type: "Purchase payment",
        description: x.purchase_id ? `Purchase #${x.purchase_id} — ${x.materialName || "Vendor payment"}` : "Vendor payment",
        person: String(x.paid_by ?? ""),
        amount: Number(x.amount || 0),
        direction: "out",
        funding: String(x.funding_source || "COMPANY") === "OWN_POCKET" ? "Own pocket" : "Company cash",
      }));

    [...(data?.otherExpenses || []), ...(data?.processingExpenses || []), ...(data?.saleProcessingCosts || [])]
      .filter((x) => x.mode === mode && x.paid_by && Number(x.amount ?? x.labour_cost ?? x.loading_cost) > 0)
      .forEach((x) => {
        const amount = x.amount != null
          ? Number(x.amount)
          : Number(x.labour_cost ?? 0) + Number(x.loading_cost ?? 0);
        rows.push({
          date: String(x.expense_date ?? x.payment_date ?? ""),
          type: "Expense",
          description: String(x.description ?? x.expense_type ?? "Business expense"),
          person: String(x.paid_by ?? ""),
          amount,
          direction: "out",
          funding: String(x.funding_source || "COMPANY") === "OWN_POCKET" ? "Own pocket" : "Company cash",
        });
      });

    (data?.manualLabour || [])
      .filter((x) => x.mode === mode && x.paid_by && Number(x.amount) > 0)
      .forEach((x) => rows.push({
        date: String(x.payment_date ?? ""),
        type: "Labour wage",
        description: `${x.workerName || "Worker"} — ${x.task_type || "Labour"}`,
        person: String(x.paid_by ?? ""),
        amount: Number(x.amount || 0),
        direction: "out",
        funding: String(x.funding_source || "COMPANY") === "OWN_POCKET" ? "Own pocket" : "Company cash",
      }));

    (data?.partnerSettlements || [])
      .filter((x) => x.mode === mode)
      .forEach((x) => rows.push({
        date: String(x.settlement_date ?? ""),
        type: "Partner settlement",
        description: x.notes ? String(x.notes) : "Company repaid partner own-pocket advance",
        person: String(x.person ?? ""),
        amount: Number(x.amount || 0),
        direction: "out",
        funding: "Company cash",
      }));

    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100);
  }, [data, mode]);

  return (
    <AdminShell
      title="Accounts & Finance"
      subtitle={`Company book, partner cash holdings, and dues for ${mode}`}
      actions={
        <button className="ad-btn ad-btn-ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      }
    >
      {message && <p className="mb-3 text-xs text-[var(--ad-accent)]">{message}</p>}

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="ad-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="ad-muted text-xs">Opening Balance</p>
              <p className="mt-1 text-2xl font-bold">{money(openingBalance)}</p>
              <p className="ad-muted mt-1 text-xs">Starting {mode} company cash</p>
            </div>
            <WalletCards size={20} className="text-[var(--ad-accent)]" />
          </div>
          <div className="mt-4 flex gap-2">
            <input
              className="ad-input min-w-0"
              type="number"
              min="0"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="Opening balance"
            />
            <button className="ad-btn ad-btn-primary" onClick={saveOpeningBalance} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="ad-card p-4">
          <p className="ad-muted text-xs">Company Account (book)</p>
          <p className="mt-1 text-3xl font-bold">{money(companyBalance)}</p>
          <p className="ad-muted mt-2 text-xs leading-relaxed">
            Opening + Sales − Company-funded payments − Expenses + Loans − Loan repayments − Partner settlements.
            Own-pocket payments do not drain this balance again — they increase “due to partner” instead.
          </p>
        </div>
      </div>

      <div className="mb-5 ad-card p-4">
        <h2 className="font-semibold">Reconciliation</h2>
        <p className="ad-muted mt-1 text-xs">Why company book and partner cards can look different</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[var(--ad-border)] p-3">
            <p className="ad-muted text-xs">Company book</p>
            <p className="mt-1 text-lg font-bold">{money(recon?.companyBook ?? companyBalance)}</p>
          </div>
          <div className="rounded-lg border border-[var(--ad-border)] p-3">
            <p className="ad-muted text-xs">Cash with partners</p>
            <p className="mt-1 text-lg font-bold">{money(recon?.cashWithPartners ?? accounts.reduce((n, a) => n + a.cashWithPartner, 0))}</p>
          </div>
          <div className="rounded-lg border border-[var(--ad-border)] p-3">
            <p className="ad-muted text-xs">Due to partners (own pocket)</p>
            <p className="mt-1 text-lg font-bold">{money(recon?.dueToPartners ?? accounts.reduce((n, a) => n + Math.max(0, a.companyOwesPartner), 0))}</p>
          </div>
          <div className="rounded-lg border border-[var(--ad-border)] p-3">
            <p className="ad-muted text-xs">External loans outstanding</p>
            <p className="mt-1 text-lg font-bold">{money(externalLoans)}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {accounts.map((account) => {
          const cashWith = account.cashWithPartner;
          const owes = account.companyOwesPartner;
          const primaryLabel = cashWith >= owes
            ? (cashWith >= 0 ? `Company cash with ${account.person}` : `Company owes ${account.person}`)
            : `Company owes ${account.person}`;
          const primaryValue = cashWith >= owes
            ? (cashWith >= 0 ? cashWith : Math.abs(cashWith))
            : Math.max(0, owes);
          return (
            <div key={account.person} className="ad-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{account.person}</p>
                  <p className="ad-muted text-xs">{primaryLabel}</p>
                </div>
                <p className="text-xl font-bold">{money(primaryValue)}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-[var(--ad-border)] p-2">
                  <p className="ad-muted">Received</p>
                  <p className="mt-1 font-semibold">{money(account.received)}</p>
                </div>
                <div className="rounded-lg border border-[var(--ad-border)] p-2">
                  <p className="ad-muted">Paid (company cash)</p>
                  <p className="mt-1 font-semibold">{money(account.companyPaid)}</p>
                </div>
                <div className="rounded-lg border border-[var(--ad-border)] p-2">
                  <p className="ad-muted">Own-pocket advances</p>
                  <p className="mt-1 font-semibold">{money(account.ownPocketPaid)}</p>
                </div>
                <div className="rounded-lg border border-[var(--ad-border)] p-2">
                  <p className="ad-muted">Settled</p>
                  <p className="mt-1 font-semibold">{money(account.settled)}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <p>Cash with {account.person}: <span className="font-semibold">{money(cashWith)}</span></p>
                <p>Company owes {account.person}: <span className="font-semibold">{money(Math.max(0, owes))}</span></p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-5 ad-card p-4">
        <h2 className="mb-1 font-semibold">Settle partner (company pays back)</h2>
        <p className="ad-muted mb-3 text-xs">Reduces “Company owes partner” when the company returns own-pocket money.</p>
        <div className="grid gap-2 md:grid-cols-5">
          <PersonSelect value={settle.person} onChange={(v) => setSettle({ ...settle, person: v })} />
          <input className="ad-input" type="number" min="0" placeholder="Amount" value={settle.amount} onChange={(e) => setSettle({ ...settle, amount: e.target.value })} />
          <input className="ad-input" type="date" value={settle.settlementDate} onChange={(e) => setSettle({ ...settle, settlementDate: e.target.value })} />
          <input className="ad-input" placeholder="Notes" value={settle.notes} onChange={(e) => setSettle({ ...settle, notes: e.target.value })} />
          <button className="ad-btn ad-btn-primary" onClick={() => void settlePartner()} disabled={settleBusy}>
            {settleBusy ? "Saving…" : "Record settlement"}
          </button>
        </div>
      </div>

      <div className="ad-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Account Transactions</h2>
            <p className="ad-muted text-xs">Receipts, company-funded and own-pocket payments, and partner settlements.</p>
          </div>
          <span className="ad-muted text-xs">{transactions.length} recent entries</span>
        </div>

        {loading ? (
          <p className="ad-muted py-8 text-center text-sm">Loading account transactions…</p>
        ) : transactions.length === 0 ? (
          <p className="ad-muted py-8 text-center text-sm">No person-attributed transactions found for {mode}.</p>
        ) : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Person</th>
                  <th>Paid from</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <tr key={index}>
                    <td>{tx.date || "—"}</td>
                    <td>{tx.type}</td>
                    <td>{tx.description}</td>
                    <td>{tx.person}</td>
                    <td>{tx.funding || (tx.direction === "in" ? "—" : "Company cash")}</td>
                    <td className="font-semibold">
                      <span className="inline-flex items-center gap-1">
                        {tx.direction === "in" ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                        {tx.direction === "in" ? "+" : "−"}{money(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
