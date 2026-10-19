"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, adminToast } from "@/components/admin-shell";
import { AdminSelect } from "@/components/admin-select";
import { PersonSelect } from "@/components/person-select";
import { useBusinessMode } from "@/components/business-mode-provider";
import { labourTasksForMode } from "@/lib/labour-tasks";
import { Pencil, Plus, Trash2, Users, X } from "lucide-react";

type Worker = {
  id: number;
  name: string;
  active: number;
  daily_rate?: number;
  half_day_rate?: number;
};
type Labour = {
  id: number;
  worker_id: number;
  workerName: string;
  amount: number;
  payment_date: string;
  paid_by: string;
  task_type: string;
  mode: string;
  notes?: string;
  attendance_type?: string;
  payment_kind?: string;
};
type ApiResponse = {
  ok?: boolean;
  error?: string;
  labourWorkers?: Worker[];
  manualLabour?: Labour[];
};
type PostBody = Record<string, string | number | boolean | number[] | undefined>;
type AttendanceType = "FULL_DAY" | "HALF_DAY";
type PaymentKind = "ATTENDANCE" | "WAGE" | "ADVANCE";

function money(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function kindLabel(kind?: string) {
  if (kind === "ATTENDANCE") return "Attendance";
  if (kind === "ADVANCE") return "Advance";
  return "Wage";
}

function dayLabel(type?: string) {
  if (type === "HALF_DAY") return "Half day";
  if (type === "FULL_DAY") return "Full day";
  return "—";
}

export default function ProcessingPage() {
  const { mode } = useBusinessMode();
  const tasks = labourTasksForMode(mode);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [labour, setLabour] = useState<Labour[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [taskType, setTaskType] = useState<string>(tasks[0]);
  const [attendanceType, setAttendanceType] = useState<AttendanceType>("FULL_DAY");
  const [paymentKind, setPaymentKind] = useState<PaymentKind>("ATTENDANCE");
  const [paymentDate, setPaymentDate] = useState(today);
  const [paidBy, setPaidBy] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editEntry, setEditEntry] = useState<Labour | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/inventory", { cache: "no-store" });
    const data: ApiResponse = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load labour data.");
    setWorkers(data.labourWorkers ?? []);
    setLabour((data.manualLabour ?? []).filter((entry) => entry.mode === mode));
  }, [mode]);

  useEffect(() => {
    setTaskType(labourTasksForMode(mode)[0]);
    setSelected([]);
    setEditEntry(null);
    setPaymentKind("ATTENDANCE");
    setAttendanceType("FULL_DAY");
    setAmount("");
    setPaidBy("");
  }, [mode]);

  useEffect(() => {
    void load().catch((error: unknown) => {
      const text = error instanceof Error ? error.message : "Unable to load labour data.";
      setMessage(text);
      adminToast(text);
    });
  }, [load]);

  const active = workers.filter((w) => w.active);
  const inactive = workers.filter((w) => !w.active);

  function rateFor(worker: Worker) {
    const daily = Number(worker.daily_rate || 0);
    const half = Number(worker.half_day_rate || 0) || Math.round((daily / 2) * 100) / 100;
    return attendanceType === "HALF_DAY" ? half : daily;
  }

  const totalPreview = useMemo(() => {
    if (paymentKind === "ADVANCE") {
      return Math.round(Number(amount || 0) * selected.length * 100) / 100;
    }
    if (paymentKind === "WAGE" && amount) {
      return Math.round(Number(amount) * selected.length * 100) / 100;
    }
    return Math.round(
      selected.reduce((n, id) => {
        const worker = active.find((w) => w.id === id);
        return n + (worker ? rateFor(worker) : 0);
      }, 0) * 100
    ) / 100;
  }, [paymentKind, amount, selected, active, attendanceType]);

  const recent = useMemo(
    () => labour.slice(0, 40),
    [labour]
  );

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
      setMessage("Saved.");
      adminToast("Saved.");
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

  async function addWorker(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const daily = Number(dailyRate || 0);
    if (
      await post({
        action: "addLabourWorker",
        name: name.trim(),
        dailyRate: daily,
        halfDayRate: Math.round((daily / 2) * 100) / 100,
      })
    ) {
      setName("");
      setDailyRate("");
      setShowAdd(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected.length) {
      setMessage("Select at least one worker.");
      return;
    }
    if (paymentKind !== "ATTENDANCE" && !paidBy) {
      setMessage("Choose who paid (Payment done by).");
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
      const missing = selected.some((id) => {
        const worker = active.find((w) => w.id === id);
        return !worker || !(rateFor(worker) > 0);
      });
      if (missing || amount) {
        amountPerWorker = Number(amount || 0);
        if (!(amountPerWorker > 0)) {
          setMessage(missing ? "Set daily rates or enter wage amount per worker." : "Enter wage amount.");
          return;
        }
      }
    }

    const ok = await post({
      action: "addManualLabour",
      mode,
      workerIds: selected,
      taskType,
      attendanceType: paymentKind === "ADVANCE" ? "" : attendanceType,
      hours: 0,
      amountPerWorker,
      paymentKind,
      paymentDate,
      paidBy: paidBy || undefined,
      notes: "",
    });
    if (ok) {
      setSelected([]);
      setAmount("");
      setPaidBy("");
      setPaymentKind("ATTENDANCE");
      setAttendanceType("FULL_DAY");
    }
  }

  async function saveEdit() {
    if (!editEntry) return;
    const kind = (editEntry.payment_kind || "WAGE") as PaymentKind;
    if (kind !== "ATTENDANCE" && !editEntry.paid_by) {
      setMessage("For wage/advance choose who paid, or switch to Attendance.");
      return;
    }
    if (!(Number(editEntry.amount) > 0)) {
      setMessage("Amount must be greater than 0.");
      return;
    }
    const ok = await post({
      action: "updateManualLabour",
      labourId: editEntry.id,
      mode,
      taskType: editEntry.task_type,
      attendanceType: kind === "ADVANCE" ? "" : (editEntry.attendance_type || "FULL_DAY"),
      hours: 0,
      amount: Number(editEntry.amount),
      paymentKind: kind,
      paymentDate: editEntry.payment_date,
      ...(kind === "ATTENDANCE" ? { clearPaidBy: true } : { paidBy: editEntry.paid_by }),
      notes: editEntry.notes || "",
    });
    if (ok) setEditEntry(null);
  }

  async function deleteEntry(entry: Labour) {
    if (!window.confirm("Delete this entry?")) return;
    await post({ action: "deleteManualLabour", labourId: entry.id, mode });
  }

  async function disableWorker(worker: Worker) {
    if (!window.confirm(`Disable ${worker.name}? History is kept.`)) return;
    await post({ action: "setLabourWorkerStatus", workerId: worker.id, active: false });
  }

  async function reactivateWorker(worker: Worker) {
    await post({ action: "setLabourWorkerStatus", workerId: worker.id, active: true });
  }

  async function editRates(worker: Worker) {
    const daily = window.prompt(`Daily rate for ${worker.name}`, String(worker.daily_rate || 0));
    if (daily == null) return;
    const half = Math.round((Number(daily) / 2) * 100) / 100;
    await post({
      action: "updateLabourWorker",
      workerId: worker.id,
      dailyRate: Number(daily || 0),
      halfDayRate: half,
    });
  }

  function toggleAll() {
    setSelected(selected.length === active.length ? [] : active.map((w) => w.id));
  }

  return (
    <AdminShell
      title="Labour Management"
      subtitle={`Simple daily labour for ${mode} — mark attendance, pay wages, or give advance.`}
      actions={
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add worker
        </button>
      }
    >
      {message && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            /saved/i.test(message)
              ? "border-[var(--ad-success)] text-[var(--ad-success)]"
              : "border-[var(--ad-danger)] text-[var(--ad-danger)]"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="ad-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Workers</h2>
              <p className="ad-muted text-xs">{active.length} active</p>
            </div>
            <button type="button" className="ad-btn ad-btn-ghost !px-2" onClick={() => setShowAdd(true)}>
              <Plus size={15} />
            </button>
          </div>
          <div className="space-y-2">
            {active.map((worker) => (
              <div key={worker.id} className="rounded-xl border border-[var(--ad-border)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{worker.name}</p>
                    <p className="ad-muted text-xs">₹{Number(worker.daily_rate || 0)}/day</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="ad-btn ad-btn-ghost !px-2 !py-1 text-xs" onClick={() => void editRates(worker)}>
                      Rate
                    </button>
                    <button type="button" className="ad-btn ad-btn-ghost !px-2 !py-1 text-xs" onClick={() => void disableWorker(worker)}>
                      Off
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!active.length && (
              <p className="ad-muted text-sm">
                {mode === "PLASTIC"
                  ? "Add workers for Plastic sorting, Plastic loading, or Plastic grinding."
                  : "Add workers for PET sorting, PET loading, Red bottle cap removal, or Bale creation."}
              </p>
            )}
          </div>
          {inactive.length > 0 && (
            <div className="mt-4 border-t border-[var(--ad-border)] pt-3">
              <p className="ad-muted mb-2 text-xs uppercase tracking-wide">Disabled</p>
              {inactive.map((worker) => (
                <div key={worker.id} className="mb-2 flex items-center justify-between gap-2 text-sm">
                  <span className="ad-muted">{worker.name}</span>
                  <button type="button" className="ad-btn ad-btn-ghost !px-2 !py-1 text-xs" onClick={() => void reactivateWorker(worker)}>
                    Reactivate
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="space-y-5">
          <form onSubmit={save} className="ad-card space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold">Today&apos;s entry</h2>
              <p className="ad-muted text-sm">1) Choose type · 2) Select workers · 3) Save</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ATTENDANCE", "Mark attendance"],
                  ["WAGE", "Pay wage"],
                  ["ADVANCE", "Give advance"],
                ] as [PaymentKind, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`ad-btn ${paymentKind === value ? "ad-btn-primary" : "ad-btn-ghost"}`}
                  onClick={() => {
                    setPaymentKind(value);
                    setAmount("");
                    if (value === "ATTENDANCE") setPaidBy("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminSelect
                label="Task"
                value={taskType}
                onChange={setTaskType}
                options={tasks.map((t) => ({ value: t, label: t }))}
              />
              {paymentKind !== "ADVANCE" && (
                <AdminSelect
                  label="Day"
                  value={attendanceType}
                  onChange={(v) => setAttendanceType(v as AttendanceType)}
                  options={[
                    { value: "FULL_DAY", label: "Full day" },
                    { value: "HALF_DAY", label: "Half day" },
                  ]}
                />
              )}
              <label className="ad-field">
                <span className="ad-field-label">Date</span>
                <input
                  className="ad-input"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </label>
              {(paymentKind === "ADVANCE" || paymentKind === "WAGE") && (
                <label className="ad-field">
                  <span className="ad-field-label">
                    {paymentKind === "ADVANCE" ? "Advance / worker *" : "Custom wage / worker (optional)"}
                  </span>
                  <input
                    className="ad-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={paymentKind === "WAGE" ? "Blank = use daily rate" : "₹"}
                    required={paymentKind === "ADVANCE"}
                  />
                </label>
              )}
            </div>

            <div className="rounded-xl border border-[var(--ad-border)] p-3">
              <div className="mb-2 flex items-center justify-between text-sm font-medium">
                <span className="inline-flex items-center gap-2">
                  <Users size={14} /> Select workers
                </span>
                <button type="button" className="ad-btn ad-btn-ghost !px-2 !py-1 text-xs" onClick={toggleAll}>
                  {selected.length === active.length && active.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {active.map((worker) => (
                  <label key={worker.id} className="flex items-center gap-2 rounded-md p-2 hover:bg-[var(--ad-hover)]">
                    <input
                      type="checkbox"
                      checked={selected.includes(worker.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, worker.id]
                            : selected.filter((id) => id !== worker.id)
                        )
                      }
                    />
                    <span className="text-sm">{worker.name}</span>
                    <span className="ad-muted text-xs">₹{Number(worker.daily_rate || 0)}/d</span>
                  </label>
                ))}
                {!active.length && <p className="ad-muted text-sm">Add a worker first.</p>}
              </div>
            </div>

            {paymentKind !== "ATTENDANCE" && (
              <PersonSelect value={paidBy} onChange={setPaidBy} required label="Payment done by" />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                Selected <b>{selected.length}</b>
                {selected.length > 0 ? <> · total {money(totalPreview)}</> : null}
              </p>
              <button type="submit" className="ad-btn ad-btn-primary" disabled={busy || !selected.length}>
                {paymentKind === "ADVANCE"
                  ? "Save advance"
                  : paymentKind === "WAGE"
                    ? "Save wage"
                    : "Save attendance"}
              </button>
            </div>
          </form>

          {editEntry && (
            <div className="ad-card border border-[var(--ad-accent)] p-5">
              <h3 className="mb-3 font-semibold">Edit entry #{editEntry.id}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AdminSelect
                  label="Kind"
                  value={editEntry.payment_kind || "WAGE"}
                  onChange={(v) =>
                    setEditEntry({
                      ...editEntry,
                      payment_kind: v,
                      paid_by: v === "ATTENDANCE" ? "" : editEntry.paid_by,
                    })
                  }
                  options={[
                    { value: "ATTENDANCE", label: "Attendance" },
                    { value: "WAGE", label: "Wage" },
                    { value: "ADVANCE", label: "Advance" },
                  ]}
                />
                <AdminSelect
                  label="Task"
                  value={editEntry.task_type || tasks[0]}
                  onChange={(v) => setEditEntry({ ...editEntry, task_type: v })}
                  options={tasks.map((t) => ({ value: t, label: t }))}
                />
                {(editEntry.payment_kind || "WAGE") !== "ADVANCE" && (
                  <AdminSelect
                    label="Day"
                    value={editEntry.attendance_type || "FULL_DAY"}
                    onChange={(v) => setEditEntry({ ...editEntry, attendance_type: v })}
                    options={[
                      { value: "FULL_DAY", label: "Full day" },
                      { value: "HALF_DAY", label: "Half day" },
                    ]}
                  />
                )}
                <label className="ad-field">
                  <span className="ad-field-label">Date</span>
                  <input
                    className="ad-input"
                    type="date"
                    value={editEntry.payment_date}
                    onChange={(e) => setEditEntry({ ...editEntry, payment_date: e.target.value })}
                  />
                </label>
                <label className="ad-field">
                  <span className="ad-field-label">Amount</span>
                  <input
                    className="ad-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={String(editEntry.amount || "")}
                    onChange={(e) => setEditEntry({ ...editEntry, amount: Number(e.target.value) })}
                  />
                </label>
                {(editEntry.payment_kind || "WAGE") !== "ATTENDANCE" && (
                  <PersonSelect
                    value={editEntry.paid_by || ""}
                    onChange={(v) => setEditEntry({ ...editEntry, paid_by: v })}
                    required
                    label="Payment done by"
                  />
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" className="ad-btn ad-btn-primary" disabled={busy} onClick={() => void saveEdit()}>
                  Update
                </button>
                <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setEditEntry(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="ad-card p-5">
            <h2 className="mb-3 font-semibold">Recent {mode} entries</h2>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Worker</th>
                    <th>Type</th>
                    <th>Day</th>
                    <th>Task</th>
                    <th>Amount</th>
                    <th>Done by</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.payment_date}</td>
                      <td>{entry.workerName}</td>
                      <td>{kindLabel(entry.payment_kind)}</td>
                      <td>{dayLabel(entry.attendance_type)}</td>
                      <td>{entry.task_type || "—"}</td>
                      <td>{money(entry.amount)}</td>
                      <td>{entry.paid_by || "—"}</td>
                      <td>
                        <div className="ad-row-actions">
                          <button
                            type="button"
                            className="ad-icon-btn ad-icon-btn-accent"
                            onClick={() => setEditEntry({ ...entry })}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className="ad-icon-btn ad-icon-btn-danger"
                            onClick={() => void deleteEntry(entry)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!recent.length && (
                    <tr>
                      <td colSpan={8} className="ad-muted">
                        No labour entries yet for {mode}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={addWorker} className="ad-card w-full max-w-md space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add worker</h3>
              <button type="button" className="ad-btn ad-btn-ghost !px-2" onClick={() => setShowAdd(false)}>
                <X size={16} />
              </button>
            </div>
            <input
              className="ad-input"
              placeholder="Worker name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="ad-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Daily rate ₹"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
            />
            <p className="ad-muted text-xs">Half-day rate is set to half of daily automatically.</p>
            <button type="submit" className="ad-btn ad-btn-primary w-full" disabled={busy}>
              Save worker
            </button>
          </form>
        </div>
      )}
    </AdminShell>
  );
}
