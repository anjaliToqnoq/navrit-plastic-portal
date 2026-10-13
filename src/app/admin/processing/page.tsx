"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, adminToast } from "@/components/admin-shell";
import { AdminSelect } from "@/components/admin-select";
import { FundingSelect } from "@/components/funding-select";
import { PersonSelect } from "@/components/person-select";
import { useBusinessMode } from "@/components/business-mode-provider";
import type { FundingSource } from "@/lib/funding";
import { LABOUR_TASKS, type LabourTask } from "@/lib/labour-tasks";
import {
  CheckSquare, Pencil, Plus, Square, Trash2, Users, WalletCards, Factory, X,
} from "lucide-react";

type Worker = {
  id: number;
  name: string;
  active: number;
  daily_rate?: number;
  half_day_rate?: number;
};
type Labour = {
  id: number;
  batch_id: number | null;
  worker_id: number;
  workerName: string;
  amount: number;
  payment_date: string;
  paid_by: string;
  task_type: string;
  mode: string;
  notes?: string;
  attendance_type?: string;
  hours?: number;
  payment_kind?: string;
  funding_source?: string;
};
type Contractor = {
  id: number;
  mode: string;
  name: string;
  phone?: string;
  rate_per_kg: number;
  active: number;
  is_current: number;
  notes?: string;
  earned?: number;
  advances?: number;
  settled?: number;
  netDue?: number;
};
type Ledger = {
  id: number;
  mode: string;
  contractor_id: number;
  contractorName?: string;
  entry_type: string;
  amount: number;
  kg: number;
  rate_per_kg: number;
  entry_date: string;
  paid_by?: string;
  notes?: string;
  batch_id?: number | null;
  sale_id?: number | null;
};
type ApiResponse = {
  ok?: boolean;
  error?: string;
  labourWorkers?: Worker[];
  manualLabour?: Labour[];
  processingContractors?: Contractor[];
  processingContractorSummaries?: Contractor[];
  processingContractorLedger?: Ledger[];
};
type PostBody = Record<string, string | number | boolean | number[] | undefined>;
type AttendanceType = "FULL_DAY" | "HALF_DAY" | "CUSTOM_HOURS";
type PaymentKind = "ATTENDANCE" | "WAGE" | "ADVANCE";

function money(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function kindLabel(kind?: string) {
  if (kind === "ATTENDANCE") return "Attendance";
  if (kind === "ADVANCE") return "Advance";
  return "Wage paid";
}

function attendanceLabel(type?: string, hours?: number) {
  if (type === "FULL_DAY") return "Full day";
  if (type === "HALF_DAY") return "Half day";
  if (type === "CUSTOM_HOURS") return `Custom ${Number(hours || 0)}h`;
  return "—";
}

export default function ProcessingPage() {
  const { mode } = useBusinessMode();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [labour, setLabour] = useState<Labour[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const monthKey = today.slice(0, 7);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [halfDayRate, setHalfDayRate] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [taskType, setTaskType] = useState("Cap Removal");
  const [attendanceType, setAttendanceType] = useState<AttendanceType>("FULL_DAY");
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentKind, setPaymentKind] = useState<PaymentKind>("ATTENDANCE");
  const [paymentDate, setPaymentDate] = useState(today);
  const [paidBy, setPaidBy] = useState("");
  const [fundingSource, setFundingSource] = useState<FundingSource>("COMPANY");
  const [wagePayMode, setWagePayMode] = useState<"FULL" | "CUSTOM">("FULL");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [editEntry, setEditEntry] = useState<Labour | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [contractorName, setContractorName] = useState("");
  const [contractorPhone, setContractorPhone] = useState("");
  const [contractorRate, setContractorRate] = useState("2");
  const [contractorNotes, setContractorNotes] = useState("");
  const [contractorAmount, setContractorAmount] = useState("");
  const [contractorPaidBy, setContractorPaidBy] = useState("");
  const [contractorFunding, setContractorFunding] = useState<FundingSource>("COMPANY");
  const [contractorPayDate, setContractorPayDate] = useState(today);
  const [contractorPayNotes, setContractorPayNotes] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/inventory", { cache: "no-store" });
    const data: ApiResponse = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load labour data.");
    setWorkers(data.labourWorkers ?? []);
    setLabour((data.manualLabour ?? []).filter((entry) => entry.mode === mode));
    const summaries = data.processingContractorSummaries ?? data.processingContractors ?? [];
    setContractors(summaries.filter((c) => c.mode === mode));
    setLedger((data.processingContractorLedger ?? []).filter((row) => row.mode === mode));
  }, [mode]);

  useEffect(() => {
    void load().catch((error: unknown) => {
      const text = error instanceof Error ? error.message : "Unable to load labour data.";
      setMessage(text);
      adminToast(text);
    });
  }, [load]);

  const active = workers.filter((worker) => worker.active);
  const currentContractor = contractors.find((c) => c.is_current && c.active) || null;

  const workerStats = useMemo(() => {
    return active.map((worker) => {
      const entries = labour.filter((entry) => entry.worker_id === worker.id);
      const wages = entries.filter((e) => (e.payment_kind || "WAGE") === "WAGE");
      const advances = entries.filter((e) => e.payment_kind === "ADVANCE");
      const attendance = entries.filter((e) => (e.payment_kind || "WAGE") !== "ADVANCE");
      const totalEarned = wages.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
        + attendance.filter((e) => e.payment_kind === "ATTENDANCE").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const monthPaid = wages
        .filter((entry) => String(entry.payment_date || "").startsWith(monthKey))
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const advanceTotal = advances.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      return {
        ...worker,
        attendance: attendance.length,
        totalEarned,
        monthEarned: monthPaid,
        advanceTotal,
      };
    });
  }, [active, labour, monthKey]);

  const selectedWorker =
    selectedWorkerId === null ? null : workerStats.find((worker) => worker.id === selectedWorkerId) || null;

  const summary = useMemo(() => {
    const todayEntries = labour.filter((entry) => entry.payment_date === today && (entry.payment_kind || "WAGE") !== "ADVANCE");
    const monthPaid = labour.filter((entry) =>
      String(entry.payment_date || "").startsWith(monthKey)
      && (entry.payment_kind || "WAGE") === "WAGE"
    );
    const monthAdvance = labour.filter((entry) =>
      String(entry.payment_date || "").startsWith(monthKey)
      && entry.payment_kind === "ADVANCE"
    );
    return {
      workers: active.length,
      todayAttendance: todayEntries.length,
      todayWage: monthPaid.filter((e) => e.payment_date === today).reduce((n, e) => n + Number(e.amount || 0), 0),
      monthWage: monthPaid.reduce((n, e) => n + Number(e.amount || 0), 0),
      monthAdvance: monthAdvance.reduce((n, e) => n + Number(e.amount || 0), 0),
    };
  }, [active.length, labour, today, monthKey]);

  function workerDayAmount(worker: Worker): number {
    const daily = Number(worker.daily_rate || 0);
    const half = Number(worker.half_day_rate || 0) || Math.round((daily / 2) * 100) / 100;
    if (attendanceType === "FULL_DAY") return daily;
    if (attendanceType === "HALF_DAY") return half;
    return Math.round((daily / 8) * Number(hours || 0) * 100) / 100;
  }

  const wageBreakdown = useMemo(() => {
    const rows = selected.map((id) => {
      const worker = active.find((w) => w.id === id);
      const rateAmount = worker ? workerDayAmount(worker) : 0;
      return {
        id,
        name: worker?.name || `#${id}`,
        rateAmount,
      };
    });
    const rateTotal = Math.round(rows.reduce((n, r) => n + r.rateAmount, 0) * 100) / 100;
    const customPer = Number(amount || 0);
    const customTotal = Math.round(customPer * selected.length * 100) / 100;
    const missingRates = rows.filter((r) => !(r.rateAmount > 0)).length;
    return { rows, rateTotal, customPer, customTotal, missingRates };
  }, [selected, active, attendanceType, hours, amount]);

  const suggestedAmount = useMemo(() => {
    if (paymentKind === "ADVANCE") return Number(amount || 0);
    if (selected.length === 1) return wageBreakdown.rows[0]?.rateAmount || Number(amount || 0);
    return Number(amount || 0);
  }, [paymentKind, selected.length, wageBreakdown, amount]);

  const wageTotalDisplay = paymentKind === "WAGE"
    ? (wagePayMode === "FULL" ? wageBreakdown.rateTotal : wageBreakdown.customTotal)
    : paymentKind === "ADVANCE"
      ? Math.round(Number(amount || 0) * selected.length * 100) / 100
      : wageBreakdown.rateTotal;

  async function post(body: PostBody): Promise<boolean> {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: ApiResponse = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      await load();
      setMessage("Saved successfully.");
      adminToast("Saved successfully.");
      return true;
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : "Something went wrong.";
      setMessage(text);
      adminToast(text);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addWorker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    if (await post({
      action: "addLabourWorker",
      name,
      dailyRate: Number(dailyRate || 0),
      halfDayRate: Number(halfDayRate || 0),
    })) {
      setName("");
      setDailyRate("");
      setHalfDayRate("");
      setShowAdd(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length) {
      setMessage("Select at least one labourer.");
      return;
    }
    if (paymentKind !== "ATTENDANCE" && !paidBy) {
      setMessage("Payment done by is required so payments sync with Accounts.");
      return;
    }
    if (attendanceType === "CUSTOM_HOURS" && paymentKind !== "ADVANCE" && !(Number(hours) > 0)) {
      setMessage("Enter custom hours greater than 0.");
      return;
    }

    let amountPerWorker: number | undefined;
    if (paymentKind === "ADVANCE") {
      amountPerWorker = Number(amount || 0);
      if (!(amountPerWorker > 0)) {
        setMessage("Enter advance amount per worker.");
        return;
      }
    } else if (paymentKind === "WAGE") {
      if (wagePayMode === "CUSTOM") {
        amountPerWorker = Number(amount || 0);
        if (!(amountPerWorker > 0)) {
          setMessage("Enter custom wage amount per worker.");
          return;
        }
      } else {
        // Full payment: let API use each worker's rate. If any rate is missing, require custom amount.
        if (wageBreakdown.missingRates > 0) {
          amountPerWorker = Number(amount || 0);
          if (!(amountPerWorker > 0)) {
            setMessage("Some workers have ₹0 rate — set daily rate or enter a custom amount.");
            return;
          }
        } else {
          amountPerWorker = undefined;
        }
      }
    } else {
      // Attendance: blank amount uses rates; optional override.
      amountPerWorker = amount ? Number(amount) : undefined;
      if (amountPerWorker === undefined && selected.length !== 1 && wageBreakdown.missingRates > 0) {
        setMessage("Set worker daily rates or enter amount per worker.");
        return;
      }
    }

    const ok = await post({
      action: "addManualLabour",
      mode,
      workerIds: selected,
      taskType,
      attendanceType,
      hours: Number(hours || 0),
      amountPerWorker,
      paymentKind,
      paymentDate,
      paidBy: paidBy || undefined,
      fundingSource,
      notes: paymentKind === "WAGE" ? "" : notes,
    });

    if (ok) {
      setSelected([]);
      setAmount("");
      setHours("");
      setPaymentDate(today);
      setPaidBy("");
      setFundingSource("COMPANY");
      setWagePayMode("FULL");
      setNotes("");
      setPaymentKind("ATTENDANCE");
      setAttendanceType("FULL_DAY");
    }
  }

  async function saveEdit() {
    if (!editEntry) return;
    const kind = (editEntry.payment_kind || "WAGE") as PaymentKind;
    if (kind !== "ATTENDANCE" && !editEntry.paid_by) {
      setMessage("For wage or advance, choose who paid — or switch Kind to “Attendance only (no cash)”.");
      return;
    }
    if (!(Number(editEntry.amount) > 0)) {
      setMessage("Enter an amount greater than 0 (use the daily/half rate for attendance).");
      return;
    }
    const ok = await post({
      action: "updateManualLabour",
      labourId: editEntry.id,
      mode,
      taskType: editEntry.task_type as LabourTask,
      attendanceType: kind === "ADVANCE" ? "" : ((editEntry.attendance_type || "FULL_DAY") as AttendanceType | ""),
      hours: Number(editEntry.hours || 0),
      amount: Number(editEntry.amount),
      paymentKind: kind,
      paymentDate: editEntry.payment_date,
      ...(kind === "ATTENDANCE"
        ? { clearPaidBy: true }
        : { paidBy: editEntry.paid_by }),
      fundingSource: (editEntry.funding_source as FundingSource) || "COMPANY",
      notes: editEntry.notes || "",
    });
    if (ok) setEditEntry(null);
  }

  async function deleteEntry(entry: Labour) {
    if (!window.confirm("Delete this attendance / payment entry?")) return;
    await post({ action: "deleteManualLabour", labourId: entry.id, mode });
  }

  async function disableWorker(worker: Worker) {
    const yes = window.confirm(
      `Disable ${worker.name}? This keeps all attendance and wage history.`
    );
    if (!yes) return;
    await post({ action: "setLabourWorkerStatus", workerId: worker.id, active: false });
    if (selectedWorkerId === worker.id) setSelectedWorkerId(null);
  }

  async function saveContractor(event: FormEvent) {
    event.preventDefault();
    if (!contractorName.trim()) {
      setMessage("Enter contractor name");
      return;
    }
    const ok = await post({
      action: "upsertProcessingContractor",
      mode,
      name: contractorName.trim(),
      phone: contractorPhone,
      ratePerKg: Number(contractorRate || 2),
      setCurrent: true,
      notes: contractorNotes,
    });
    if (ok) {
      setContractorName("");
      setContractorPhone("");
      setContractorRate("2");
      setContractorNotes("");
    }
  }

  async function contractorCash(kind: "addContractorAdvance" | "settleContractor") {
    if (!(Number(contractorAmount) > 0)) {
      setMessage("Enter a valid amount");
      return;
    }
    if (!contractorPaidBy) {
      setMessage("Payment done by is required for Accounts sync");
      return;
    }
    const ok = await post({
      action: kind,
      mode,
      contractorId: currentContractor?.id,
      amount: Number(contractorAmount),
      entryDate: contractorPayDate,
      paidBy: contractorPaidBy,
      fundingSource: contractorFunding,
      notes: contractorPayNotes,
    });
    if (ok) {
      setContractorAmount("");
      setContractorPaidBy("");
      setContractorPayNotes("");
      setContractorPayDate(today);
    }
  }

  function toggleAll() {
    if (selected.length === active.length) setSelected([]);
    else setSelected(active.map((w) => w.id));
  }

  return (
    <AdminShell
      title="Labour Management"
      subtitle={`${mode} daily labour attendance + PET processing contractor (₹2/kg) — syncs with Accounts`}
      actions={
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Labour
        </button>
      }
    >
      {message && (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
          /success/i.test(message)
            ? "border-[var(--ad-success)] text-[var(--ad-success)]"
            : "border-[var(--ad-danger)] text-[var(--ad-danger)]"
        }`}>{message}</div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5 ad-fade-in">
        <div className="ad-card p-4">
          <p className="ad-muted text-xs">Active workers</p>
          <p className="mt-1 text-2xl font-bold">{summary.workers}</p>
        </div>
        <div className="ad-card p-4">
          <p className="ad-muted text-xs">Attendance today</p>
          <p className="mt-1 text-2xl font-bold">{summary.todayAttendance}</p>
        </div>
        <div className="ad-card p-4">
          <p className="ad-muted text-xs">Wages paid today</p>
          <p className="mt-1 text-2xl font-bold">{money(summary.todayWage)}</p>
        </div>
        <div className="ad-card p-4">
          <p className="ad-muted text-xs">Wages this month</p>
          <p className="mt-1 text-2xl font-bold">{money(summary.monthWage)}</p>
        </div>
        <div className="ad-card p-4">
          <p className="ad-muted text-xs">Advances this month</p>
          <p className="mt-1 text-2xl font-bold">{money(summary.monthAdvance)}</p>
        </div>
      </div>

      {/* Processing contractor */}
      <section className="mb-5 ad-card p-5 ad-fade-in">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Factory size={18} /> Processing contractor (₹2/kg)
            </h2>
            <p className="ad-muted mt-1 text-sm">
              Contractual PET processing. Earns on batch complete and on sale (₹ rate × kg). Advances & settlements hit Accounts.
            </p>
          </div>
          {currentContractor && (
            <div className="rounded-xl border border-[var(--ad-accent)] bg-[var(--ad-accent-dim)] px-4 py-3 text-sm">
              <p className="font-semibold text-[var(--ad-accent)]">Current: {currentContractor.name}</p>
              <p className="ad-muted mt-1">Rate ₹{Number(currentContractor.rate_per_kg || 2)}/kg</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <form onSubmit={saveContractor} className="space-y-2 rounded-xl border border-[var(--ad-border)] p-3">
            <p className="text-sm font-semibold">Add / set current contractor</p>
            <input className="ad-input" placeholder="Contractor name" value={contractorName} onChange={(e) => setContractorName(e.target.value)} />
            <input className="ad-input" placeholder="Phone" value={contractorPhone} onChange={(e) => setContractorPhone(e.target.value)} />
            <input className="ad-input" type="number" min="0" step="0.01" placeholder="Rate / kg" value={contractorRate} onChange={(e) => setContractorRate(e.target.value)} />
            <input className="ad-input" placeholder="Notes" value={contractorNotes} onChange={(e) => setContractorNotes(e.target.value)} />
            <button type="submit" className="ad-btn ad-btn-primary w-full" disabled={busy}>Save as current</button>
            {contractors.length > 0 && (
              <div className="space-y-1 pt-2">
                {contractors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={"flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left text-xs " + (c.is_current ? "border-[var(--ad-accent)]" : "border-[var(--ad-border)]")}
                    onClick={() => void post({ action: "setCurrentProcessingContractor", mode, contractorId: c.id })}
                  >
                    <span>{c.name}{c.is_current ? " · current" : ""}</span>
                    <span className="font-semibold">{money(Number(c.netDue || 0))}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          <div className="space-y-2 rounded-xl border border-[var(--ad-border)] p-3">
            <p className="text-sm font-semibold">Contractor balance</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[var(--ad-input)] p-2">
                <p className="ad-muted">Earned (batch+sale)</p>
                <p className="mt-1 text-lg font-bold">{money(Number(currentContractor?.earned || 0))}</p>
              </div>
              <div className="rounded-lg bg-[var(--ad-input)] p-2">
                <p className="ad-muted">Advances given</p>
                <p className="mt-1 text-lg font-bold">{money(Number(currentContractor?.advances || 0))}</p>
              </div>
              <div className="rounded-lg bg-[var(--ad-input)] p-2">
                <p className="ad-muted">Settled</p>
                <p className="mt-1 text-lg font-bold">{money(Number(currentContractor?.settled || 0))}</p>
              </div>
              <div className="rounded-lg bg-[var(--ad-input)] p-2">
                <p className="ad-muted">Net due</p>
                <p className={"mt-1 text-lg font-bold " + (Number(currentContractor?.netDue || 0) > 0 ? "text-[var(--ad-danger)]" : "text-[var(--ad-success)]")}>
                  {money(Number(currentContractor?.netDue || 0))}
                </p>
              </div>
            </div>
            <p className="ad-muted text-[11px]">Positive net due = company still owes contractor after advances.</p>
          </div>

          <div className="space-y-2 rounded-xl border border-[var(--ad-border)] p-3">
            <p className="text-sm font-semibold">Advance / settle (cash)</p>
            <input className="ad-input" type="number" min="0" step="0.01" placeholder="Amount" value={contractorAmount} onChange={(e) => setContractorAmount(e.target.value)} />
            <input className="ad-input" type="date" value={contractorPayDate} onChange={(e) => setContractorPayDate(e.target.value)} />
            <PersonSelect value={contractorPaidBy} onChange={setContractorPaidBy} required />
            <FundingSelect value={contractorFunding} onChange={setContractorFunding} />
            <input className="ad-input" placeholder="Notes" value={contractorPayNotes} onChange={(e) => setContractorPayNotes(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ad-btn ad-btn-primary" disabled={busy || !currentContractor} onClick={() => void contractorCash("addContractorAdvance")}>
                Give advance
              </button>
              <button type="button" className="ad-btn ad-btn-ghost" disabled={busy || !currentContractor} onClick={() => void contractorCash("settleContractor")}>
                Settle due
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="ad-table w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Contractor</th>
                <th>Kg</th>
                <th>Amount</th>
                <th>Done by</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {ledger.slice(0, 20).map((row) => (
                <tr key={row.id}>
                  <td>{row.entry_date}</td>
                  <td>{row.entry_type.replace("_", " ")}</td>
                  <td>{row.contractorName}</td>
                  <td>{Number(row.kg || 0) > 0 ? `${Number(row.kg).toFixed(2)} kg` : "—"}</td>
                  <td>{money(row.amount)}</td>
                  <td>{row.paid_by || "—"}</td>
                  <td>{row.notes || "—"}</td>
                </tr>
              ))}
              {!ledger.length && (
                <tr><td colSpan={7} className="ad-muted">No contractor ledger yet. Add a current contractor, then process or sell PET.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="ad-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Daily labour</h2>
              <p className="ad-muted text-xs">{active.length} active workers</p>
            </div>
            <button type="button" className="ad-btn ad-btn-ghost !px-2" onClick={() => setShowAdd(true)} aria-label="Add labour">
              <Plus size={15} />
            </button>
          </div>

          <div className="space-y-2">
            {workerStats.map((worker) => (
              <button
                key={worker.id}
                type="button"
                onClick={() => setSelectedWorkerId(worker.id)}
                className={
                  "w-full rounded-xl border p-3 text-left transition " +
                  (selectedWorkerId === worker.id
                    ? "border-[var(--ad-accent)] bg-[var(--ad-accent-dim)]"
                    : "border-[var(--ad-border)] hover:bg-[var(--ad-hover)]")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{worker.name}</span>
                  <span className="text-[10px] ad-muted">₹{Number(worker.daily_rate || 0)}/day</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="ad-muted">Attendance</p>
                    <p className="font-semibold">{worker.attendance}</p>
                  </div>
                  <div>
                    <p className="ad-muted">Advances</p>
                    <p className="font-semibold">{money(worker.advanceTotal)}</p>
                  </div>
                </div>
              </button>
            ))}
            {!workerStats.length && (
              <p className="ad-muted text-sm">No active labour. Add the first worker.</p>
            )}
          </div>
        </aside>

        <section className="space-y-5">
          {selectedWorker && (
            <div className="ad-card p-5 ad-fade-in">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="ad-muted text-xs uppercase tracking-wide">Labour profile</p>
                  <h2 className="mt-1 text-xl font-semibold">{selectedWorker.name}</h2>
                  <p className="ad-muted mt-1 text-sm">
                    Full day ₹{Number(selectedWorker.daily_rate || 0).toFixed(2)} · Half ₹{Number(selectedWorker.half_day_rate || 0).toFixed(2)}
                  </p>
                </div>
                <button type="button" className="ad-btn ad-btn-danger" disabled={busy} onClick={() => void disableWorker(selectedWorker)}>
                  Disable Labour
                </button>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="ad-table w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Kind</th>
                      <th>Day type</th>
                      <th>Task</th>
                      <th>Amount</th>
                      <th>Done by</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labour
                      .filter((entry) => entry.worker_id === selectedWorker.id)
                      .map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.payment_date}</td>
                          <td>{kindLabel(entry.payment_kind)}</td>
                          <td>{attendanceLabel(entry.attendance_type, entry.hours)}</td>
                          <td>{entry.task_type || "—"}</td>
                          <td>{money(entry.amount)}</td>
                          <td>{entry.paid_by || "—"}</td>
                          <td>
                            <div className="ad-row-actions">
                              <button type="button" className="ad-icon-btn ad-icon-btn-accent" onClick={() => setEditEntry({ ...entry })}>
                                <Pencil size={13} /> Edit
                              </button>
                              <button type="button" className="ad-icon-btn ad-icon-btn-danger" onClick={() => void deleteEntry(entry)}>
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {!labour.some((entry) => entry.worker_id === selectedWorker.id) && (
                      <tr><td colSpan={7} className="ad-muted">No attendance recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {editEntry && (
            <div className="ad-card border border-[var(--ad-accent)] p-5 ad-fade-in">
              <h3 className="mb-3 font-semibold">Edit attendance / payment #{editEntry.id}</h3>
              <p className="ad-muted mb-3 text-sm">
                Use <strong>Attendance only</strong> to change day type / hours without any payment person.
                Wage or Advance needs “Payment done by” so Accounts stays correct.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AdminSelect
                  label="Kind"
                  value={editEntry.payment_kind || "WAGE"}
                  onChange={(v) => setEditEntry({
                    ...editEntry,
                    payment_kind: v,
                    paid_by: v === "ATTENDANCE" ? "" : editEntry.paid_by,
                  })}
                  options={[
                    { value: "ATTENDANCE", label: "Attendance only (no cash)" },
                    { value: "WAGE", label: "Wage paid (Accounts)" },
                    { value: "ADVANCE", label: "Advance (Accounts)" },
                  ]}
                />
                <AdminSelect
                  label="Task"
                  value={editEntry.task_type || "Cap Removal"}
                  onChange={(v) => setEditEntry({ ...editEntry, task_type: v })}
                  options={LABOUR_TASKS.map((t) => ({ value: t, label: t }))}
                />
                {(editEntry.payment_kind || "WAGE") !== "ADVANCE" && (
                  <AdminSelect
                    label="Day type"
                    value={editEntry.attendance_type || "FULL_DAY"}
                    onChange={(v) => setEditEntry({ ...editEntry, attendance_type: v })}
                    options={[
                      { value: "FULL_DAY", label: "Full day" },
                      { value: "HALF_DAY", label: "Half day" },
                      { value: "CUSTOM_HOURS", label: "Custom hours" },
                    ]}
                  />
                )}
                {(editEntry.attendance_type || "") === "CUSTOM_HOURS" && (editEntry.payment_kind || "WAGE") !== "ADVANCE" && (
                  <label className="ad-field">
                    <span className="ad-field-label">Hours</span>
                    <input className="ad-input" type="number" min="0" step="0.5" value={String(editEntry.hours || "")} onChange={(e) => setEditEntry({ ...editEntry, hours: Number(e.target.value) })} />
                  </label>
                )}
                <label className="ad-field">
                  <span className="ad-field-label">
                    {(editEntry.payment_kind || "WAGE") === "ATTENDANCE" ? "Day value (not paid)" : "Amount"}
                  </span>
                  <input className="ad-input" type="number" min="0.01" step="0.01" value={String(editEntry.amount)} onChange={(e) => setEditEntry({ ...editEntry, amount: Number(e.target.value) })} />
                </label>
                <label className="ad-field">
                  <span className="ad-field-label">Date</span>
                  <input className="ad-input" type="date" value={editEntry.payment_date} onChange={(e) => setEditEntry({ ...editEntry, payment_date: e.target.value })} />
                </label>
                {(editEntry.payment_kind || "WAGE") !== "ATTENDANCE" && (
                  <PersonSelect
                    value={editEntry.paid_by || ""}
                    onChange={(v) => setEditEntry({ ...editEntry, paid_by: v })}
                    required
                  />
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="ad-btn ad-btn-primary" onClick={() => void saveEdit()} disabled={busy}>Save changes</button>
                <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setEditEntry(null)}>Cancel</button>
              </div>
            </div>
          )}

          <section className="ad-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Record attendance / payment</h2>
                <p className="ad-muted mt-1 text-sm">
                  Full day, half day or custom hours. Attendance-only does not hit Accounts; Wage paid / Advance does.
                </p>
              </div>
              <WalletCards size={18} className="text-[var(--ad-muted)]" />
            </div>

            <form onSubmit={save} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AdminSelect
                  label="Record as"
                  value={paymentKind}
                  onChange={(v) => {
                    const kind = v as PaymentKind;
                    setPaymentKind(kind);
                    if (kind === "WAGE") {
                      setWagePayMode("FULL");
                      setAmount("");
                    }
                  }}
                  options={[
                    { value: "ATTENDANCE", label: "Attendance only (no cash)" },
                    { value: "WAGE", label: "Wage paid (cash → Accounts)" },
                    { value: "ADVANCE", label: "Advance payment (cash → Accounts)" },
                  ]}
                />
                {paymentKind !== "ADVANCE" && (
                  <AdminSelect
                    label="Day type"
                    value={attendanceType}
                    onChange={(v) => setAttendanceType(v as AttendanceType)}
                    options={[
                      { value: "FULL_DAY", label: "Full day" },
                      { value: "HALF_DAY", label: "Half day" },
                      { value: "CUSTOM_HOURS", label: "Custom hours" },
                    ]}
                  />
                )}
                <AdminSelect
                  label="Task"
                  value={taskType}
                  onChange={setTaskType}
                  options={LABOUR_TASKS.map((t) => ({ value: t, label: t }))}
                />
                {attendanceType === "CUSTOM_HOURS" && paymentKind !== "ADVANCE" && (
                  <label className="ad-field">
                    <span className="ad-field-label">Hours</span>
                    <input className="ad-input" type="number" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 3" />
                  </label>
                )}
                <label className="ad-field">
                  <span className="ad-field-label">Date</span>
                  <input className="ad-input" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                </label>
                {paymentKind === "ATTENDANCE" && (
                  <label className="ad-field">
                    <span className="ad-field-label">Amount / worker (blank = from rate)</span>
                    <input className="ad-input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={suggestedAmount > 0 ? String(suggestedAmount) : "₹"} />
                  </label>
                )}
                {paymentKind === "ADVANCE" && (
                  <label className="ad-field">
                    <span className="ad-field-label">Advance / worker</span>
                    <input className="ad-input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹" required />
                  </label>
                )}
              </div>

              <div className="rounded-lg border border-[var(--ad-border)] p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-sm font-medium">
                  <span className="inline-flex items-center gap-2"><Users size={14} /> Select labour</span>
                  <button type="button" className="ad-btn ad-btn-ghost !px-2 !py-1 text-xs" onClick={toggleAll}>
                    {selected.length === active.length && active.length > 0 ? (<><Square size={12} /> Clear all</>) : (<><CheckSquare size={12} /> Select all</>)}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {active.map((worker) => (
                    <label key={worker.id} className="flex items-center gap-2 rounded-md p-2 hover:bg-[var(--ad-hover)]">
                      <input
                        type="checkbox"
                        checked={selected.includes(worker.id)}
                        onChange={(event) =>
                          setSelected(event.target.checked ? [...selected, worker.id] : selected.filter((id) => id !== worker.id))
                        }
                      />
                      <span className="text-sm">{worker.name}</span>
                      <span className="ad-muted text-xs">₹{Number(worker.daily_rate || 0)}/d</span>
                    </label>
                  ))}
                </div>
              </div>

              {paymentKind === "WAGE" && (
                <div className="space-y-3 rounded-xl border border-[var(--ad-accent)] bg-[var(--ad-accent-dim)] p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--ad-muted)]">Wage total (auto)</p>
                      <p className="mt-1 text-3xl font-bold text-[var(--ad-accent)]">{money(wageTotalDisplay)}</p>
                      <p className="ad-muted mt-1 text-xs">
                        {selected.length} worker{selected.length === 1 ? "" : "s"}
                        {wagePayMode === "FULL"
                          ? (wageBreakdown.missingRates
                            ? " · some rates missing — enter custom amount"
                            : " · from daily / half / hour rates")
                          : " · custom amount × workers"}
                      </p>
                    </div>
                    <AdminSelect
                      label="Payment"
                      value={wagePayMode}
                      onChange={(v) => {
                        setWagePayMode(v as "FULL" | "CUSTOM");
                        if (v === "FULL") setAmount("");
                      }}
                      options={[
                        { value: "FULL", label: "Full payment (from rates)" },
                        { value: "CUSTOM", label: "Custom amount" },
                      ]}
                    />
                  </div>
                  {(wagePayMode === "CUSTOM" || wageBreakdown.missingRates > 0) && (
                    <label className="ad-field max-w-xs">
                      <span className="ad-field-label">Amount / worker</span>
                      <input
                        className="ad-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="₹"
                        required={wagePayMode === "CUSTOM" || wageBreakdown.missingRates > 0}
                      />
                    </label>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PersonSelect value={paidBy} onChange={setPaidBy} required />
                    <FundingSelect value={fundingSource} onChange={setFundingSource} />
                  </div>
                </div>
              )}

              {paymentKind === "ADVANCE" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <PersonSelect value={paidBy} onChange={setPaidBy} required />
                  <FundingSelect value={fundingSource} onChange={setFundingSource} />
                </div>
              )}

              {paymentKind !== "WAGE" && (
                <input className="ad-input w-full" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  Selected <b>{selected.length}</b>
                  {paymentKind !== "ATTENDANCE" && selected.length > 0 ? <> · total {money(wageTotalDisplay)}</> : null}
                  {paymentKind === "ATTENDANCE" && selected.length === 1 && suggestedAmount > 0 && !amount ? <> · suggested {money(suggestedAmount)}</> : null}
                </p>
                <button type="submit" className="ad-btn ad-btn-primary" disabled={busy}>
                  {paymentKind === "ADVANCE" ? "Save advance" : paymentKind === "ATTENDANCE" ? "Save attendance" : "Save wage payment"}
                </button>
              </div>
            </form>
          </section>
        </section>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center">
          <form onSubmit={addWorker} className="ad-card w-full max-w-md p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Add labour worker</h3>
              <button type="button" className="ad-btn ad-btn-ghost !px-2" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <div className="space-y-2">
              <input className="ad-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <input className="ad-input" type="number" min="0" step="0.01" placeholder="Full day rate ₹" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
              <input className="ad-input" type="number" min="0" step="0.01" placeholder="Half day rate ₹ (optional)" value={halfDayRate} onChange={(e) => setHalfDayRate(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="ad-btn ad-btn-primary" disabled={busy}>Save worker</button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}
