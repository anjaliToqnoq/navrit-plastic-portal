"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, adminToast } from "@/components/admin-shell";
import { PersonSelect } from "@/components/person-select";
import { useBusinessMode } from "@/components/business-mode-provider";
import { CheckSquare, Plus, Square, Users, WalletCards, X } from "lucide-react";

type Worker = { id: number; name: string; active: number };
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
};
type ApiResponse = { ok?: boolean; error?: string; labourWorkers?: Worker[]; manualLabour?: Labour[] };
type PostBody = Record<string, string | number | boolean | number[] | undefined>;

function money(n: number) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

export default function ProcessingPage() {
  const { mode } = useBusinessMode();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [labour, setLabour] = useState<Labour[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const monthKey = today.slice(0, 7);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [taskType, setTaskType] = useState("Cap Removal");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [paidBy, setPaidBy] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/inventory", { cache: "no-store" });
    const data: ApiResponse = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load labour data.");
    setWorkers(data.labourWorkers ?? []);
    setLabour((data.manualLabour ?? []).filter((entry) => entry.mode === mode));
  }, [mode]);

  useEffect(() => {
    void load().catch((error: unknown) => {
      const text = error instanceof Error ? error.message : "Unable to load labour data.";
      setMessage(text);
      adminToast(text);
    });
  }, [load]);

  const active = workers.filter((worker) => worker.active);

  const workerStats = useMemo(() => {
    return active.map((worker) => {
      const entries = labour.filter((entry) => entry.worker_id === worker.id);
      const totalEarned = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const monthEarned = entries
        .filter((entry) => String(entry.payment_date || "").startsWith(monthKey))
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      return { ...worker, attendance: entries.length, totalEarned, monthEarned };
    });
  }, [active, labour, monthKey]);

  const selectedWorker =
    selectedWorkerId === null ? null : workerStats.find((worker) => worker.id === selectedWorkerId) || null;

  const summary = useMemo(() => {
    const todayEntries = labour.filter((entry) => entry.payment_date === today);
    const monthEntries = labour.filter((entry) => String(entry.payment_date || "").startsWith(monthKey));
    return {
      workers: active.length,
      todayAttendance: todayEntries.length,
      todayWage: todayEntries.reduce((n, e) => n + Number(e.amount || 0), 0),
      monthWage: monthEntries.reduce((n, e) => n + Number(e.amount || 0), 0),
    };
  }, [active.length, labour, today, monthKey]);

  const total = useMemo(() => selected.length * Number(amount || 0), [selected.length, amount]);

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
    if (await post({ action: "addLabourWorker", name })) {
      setName("");
      setShowAdd(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length || Number(amount) <= 0) {
      setMessage("Select at least one labourer and enter a valid wage.");
      return;
    }
    if (!paidBy) {
      setMessage("Payment done by is required so wages sync with Accounts.");
      return;
    }

    const ok = await post({
      action: "addManualLabour",
      mode,
      workerIds: selected,
      taskType,
      amountPerWorker: Number(amount),
      paymentDate,
      paidBy,
      notes,
    });

    if (ok) {
      setSelected([]);
      setAmount("");
      setPaymentDate(today);
      setPaidBy("");
      setNotes("");
    }
  }

  async function disableWorker(worker: Worker) {
    const yes = window.confirm(
      `Disable ${worker.name}? This keeps all attendance and wage history. The worker can be reactivated later.`
    );
    if (!yes) return;
    await post({ action: "setLabourWorkerStatus", workerId: worker.id, active: false });
    if (selectedWorkerId === worker.id) setSelectedWorkerId(null);
  }

  function toggleAll() {
    if (selected.length === active.length) setSelected([]);
    else setSelected(active.map((w) => w.id));
  }

  return (
    <AdminShell
      title="Labour Management"
      subtitle={`${mode} labour attendance and wages — Payment done by syncs to Accounts`}
      actions={
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Labour
        </button>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="ad-card p-4">
          <p className="ad-muted text-xs">Active workers</p>
          <p className="mt-1 text-2xl font-bold">{summary.workers}</p>
        </div>
        <div className="ad-card p-4">
          <p className="ad-muted text-xs">Attendance today</p>
          <p className="mt-1 text-2xl font-bold">{summary.todayAttendance}</p>
        </div>
        <div className="ad-card p-4">
          <p className="ad-muted text-xs">Wages today</p>
          <p className="mt-1 text-2xl font-bold">{money(summary.todayWage)}</p>
        </div>
        <div className="ad-card p-4">
          <p className="ad-muted text-xs">Wages this month</p>
          <p className="mt-1 text-2xl font-bold">{money(summary.monthWage)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="ad-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Labour</h2>
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
                  <span className="rounded-full bg-[var(--ad-accent-dim)] px-2 py-0.5 text-[10px] font-bold text-[var(--ad-accent)]">
                    ACTIVE
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="ad-muted">Attendance</p>
                    <p className="font-semibold">{worker.attendance}</p>
                  </div>
                  <div>
                    <p className="ad-muted">This month</p>
                    <p className="font-semibold">{money(worker.monthEarned)}</p>
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
            <div className="ad-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="ad-muted text-xs uppercase tracking-wide">Labour profile</p>
                  <h2 className="mt-1 text-xl font-semibold">{selectedWorker.name}</h2>
                  <p className="ad-muted mt-1 text-sm">Attendance and wage history for {mode}</p>
                </div>
                <button
                  type="button"
                  className="ad-btn ad-btn-danger"
                  disabled={busy}
                  onClick={() => void disableWorker(selectedWorker)}
                >
                  Disable Labour
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--ad-border)] bg-[var(--ad-input)] p-4">
                  <p className="ad-muted text-xs">Total attendance</p>
                  <p className="mt-1 text-2xl font-bold">{selectedWorker.attendance}</p>
                </div>
                <div className="rounded-xl border border-[var(--ad-border)] bg-[var(--ad-input)] p-4">
                  <p className="ad-muted text-xs">Total wage recorded</p>
                  <p className="mt-1 text-2xl font-bold">{money(selectedWorker.totalEarned)}</p>
                </div>
                <div className="rounded-xl border border-[var(--ad-border)] bg-[var(--ad-input)] p-4">
                  <p className="ad-muted text-xs">This month</p>
                  <p className="mt-1 text-2xl font-bold">{money(selectedWorker.monthEarned)}</p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="ad-table w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Task</th>
                      <th>Wage</th>
                      <th>Payment done by</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labour
                      .filter((entry) => entry.worker_id === selectedWorker.id)
                      .map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.payment_date}</td>
                          <td>{entry.batch_id ? `Batch #${entry.batch_id}` : "Direct labour"}</td>
                          <td>{entry.task_type || "Manual Labour"}</td>
                          <td>{money(entry.amount)}</td>
                          <td>{entry.paid_by || "—"}</td>
                          <td>{entry.notes || "—"}</td>
                        </tr>
                      ))}
                    {!labour.some((entry) => entry.worker_id === selectedWorker.id) && (
                      <tr>
                        <td colSpan={6} className="ad-muted">
                          No attendance recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <section className="ad-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Record Attendance</h2>
                <p className="ad-muted mt-1 text-sm">
                  Cap removal / sorting wages. Payment done by updates Accounts for {mode}.
                </p>
              </div>
              <WalletCards size={18} className="text-[var(--ad-muted)]" />
            </div>

            <form onSubmit={save} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="ad-input" value={taskType} onChange={(event) => setTaskType(event.target.value)}>
                  <option>Cap Removal</option>
                  <option>Sorting</option>
                  <option>Other</option>
                </select>
                <input
                  className="ad-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="₹ / worker"
                  required
                />
                <input
                  className="ad-input"
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  required
                />
                <PersonSelect value={paidBy} onChange={setPaidBy} required />
              </div>

              <input
                className="ad-input w-full"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Notes (optional)"
              />

              <div className="rounded-lg border border-[var(--ad-border)] p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-sm font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Users size={14} /> Select labour
                  </span>
                  <button type="button" className="ad-btn ad-btn-ghost !px-2 !py-1 text-xs" onClick={toggleAll}>
                    {selected.length === active.length && active.length > 0 ? (
                      <>
                        <Square size={12} /> Clear all
                      </>
                    ) : (
                      <>
                        <CheckSquare size={12} /> Select all
                      </>
                    )}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {active.map((worker) => (
                    <label key={worker.id} className="flex items-center gap-2 rounded-md p-2 hover:bg-[var(--ad-hover)]">
                      <input
                        type="checkbox"
                        checked={selected.includes(worker.id)}
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? [...selected, worker.id]
                              : selected.filter((id) => id !== worker.id)
                          )
                        }
                      />
                      <span>{worker.name}</span>
                    </label>
                  ))}
                  {!active.length && <p className="ad-muted text-sm">Add a labourer first.</p>}
                </div>
                <p className="ad-muted mt-2 text-xs">{selected.length} selected · total {money(total)}</p>
              </div>

              <button
                className="ad-btn ad-btn-primary w-full"
                disabled={busy || !selected.length || Number(amount) <= 0 || !paidBy}
              >
                Save Attendance & Labour
              </button>
            </form>
          </section>

          <section className="ad-card p-5">
            <div>
              <h2 className="text-lg font-semibold">Recent Labour Entries</h2>
              <p className="ad-muted text-sm">Latest attendance and wage entries for {mode}</p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="ad-table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Worker</th>
                    <th>Task</th>
                    <th>Wage</th>
                    <th>Payment done by</th>
                  </tr>
                </thead>
                <tbody>
                  {labour.slice(0, 100).map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.payment_date}</td>
                      <td>{entry.batch_id ? `Batch #${entry.batch_id}` : "Direct labour"}</td>
                      <td>{entry.workerName}</td>
                      <td>{entry.task_type || "Manual Labour"}</td>
                      <td>{money(entry.amount)}</td>
                      <td>{entry.paid_by || "—"}</td>
                    </tr>
                  ))}
                  {!labour.length && (
                    <tr>
                      <td colSpan={6} className="ad-muted">
                        No labour entries yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>

      {showAdd && (
        <div className="drawer-backdrop" onClick={() => setShowAdd(false)}>
          <div className="drawer-panel bg-[var(--ad-card)] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Add Labour</h2>
                <p className="ad-muted mt-1 text-sm">Create once, then record attendance daily.</p>
              </div>
              <button type="button" className="ad-btn ad-btn-ghost !px-2" onClick={() => setShowAdd(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={addWorker} className="mt-5 space-y-3">
              <input
                autoFocus
                className="ad-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Labour name"
              />
              <button className="ad-btn ad-btn-primary w-full" disabled={busy || name.trim().length < 2}>
                <Plus size={15} /> Add Labour
              </button>
            </form>

            <div className="mt-6 rounded-lg border border-[var(--ad-border)] p-3 text-xs ad-muted">
              Labour cannot be deleted while wage history exists. Use Disable to retain historical attendance and payments.
            </div>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-sm">{message}</p>}
    </AdminShell>
  );
}
