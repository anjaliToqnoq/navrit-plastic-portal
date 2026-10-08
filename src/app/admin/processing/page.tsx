"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useBusinessMode } from "@/components/business-mode-provider";

type Worker = { id: number; name: string; active: number };
type Batch = { id: number; mode: string; batch_date: string; total_input_kg: number; status: string };
type Labour = { id: number; batch_id: number; workerName: string; amount: number; payment_date: string; paid_by: string; task_type: string; mode: string };
type ApiResponse = { ok?: boolean; error?: string; labourWorkers?: Worker[]; processingBatches?: Batch[]; manualLabour?: Labour[] };
type PostBody = Record<string, string | number | boolean | number[] | undefined>;

export default function ProcessingPage() {
  const { mode } = useBusinessMode();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [labour, setLabour] = useState<Labour[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [batchId, setBatchId] = useState("");
  const [taskType, setTaskType] = useState("Cap Removal");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [paidBy, setPaidBy] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/inventory?mode=" + mode, { cache: "no-store" });
    const data: ApiResponse = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load labour data.");
    setWorkers(data.labourWorkers ?? []);
    setBatches((data.processingBatches ?? []).filter((batch) => batch.mode === mode && batch.status !== "CANCELLED"));
    setLabour((data.manualLabour ?? []).filter((entry) => entry.mode === mode));
  }, [mode]);

  useEffect(() => {
    void load().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Unable to load labour data.");
    });
  }, [load]);

  const active = workers.filter((worker) => worker.active);
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
      return true;
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addWorker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await post({ action: "addLabourWorker", name })) setName("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!batchId || !selected.length || Number(amount) <= 0) {
      setMessage("Select a batch, workers and amount.");
      return;
    }
    if (await post({
      action: "addManualLabour",
      mode,
      batchId: Number(batchId),
      workerIds: selected,
      taskType,
      amountPerWorker: Number(amount),
      paymentDate,
      paidBy,
      notes,
    })) {
      setSelected([]);
      setAmount("");
      setBatchId("");
      setPaymentDate(today);
      setPaidBy("");
      setNotes("");
    }
  }

  return (
    <AdminShell title="Processing" subtitle="Processing and manual labour management">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="ad-card p-5">
          <h2 className="text-lg font-semibold">Labour Management</h2>
          <p className="ad-muted mt-1 text-sm">Add workers once and disable them when they leave.</p>
          <form onSubmit={addWorker} className="mt-4 flex gap-2">
            <input className="ad-input flex-1" value={name} onChange={(event) => setName(event.target.value)} placeholder="Worker name" />
            <button className="ad-btn" disabled={busy || !name.trim()}>+ Add Worker</button>
          </form>
          <div className="mt-4 space-y-2">
            {active.map((worker) => (
              <div key={worker.id} className="flex items-center justify-between rounded-lg border border-[var(--ad-border)] p-3">
                <span>{worker.name}</span>
                <button type="button" className="ad-btn-secondary text-xs" disabled={busy} onClick={() => void post({ action: "setLabourWorkerStatus", workerId: worker.id, active: false })}>Disable</button>
              </div>
            ))}
            {!active.length && <p className="ad-muted text-sm">No active workers.</p>}
          </div>
        </section>

        <section className="ad-card p-5">
          <h2 className="text-lg font-semibold">Manual Labour Attendance</h2>
          <p className="ad-muted mt-1 text-sm">Record workers against a processing batch.</p>
          <form onSubmit={save} className="mt-4 space-y-3">
            <select className="ad-input w-full" value={batchId} onChange={(event) => setBatchId(event.target.value)}>
              <option value="">Select processing batch</option>
              {batches.map((batch) => <option key={batch.id} value={batch.id}>#{batch.id} · {batch.batch_date} · {batch.total_input_kg} kg</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select className="ad-input" value={taskType} onChange={(event) => setTaskType(event.target.value)}>
                <option>Cap Removal</option><option>Sorting</option><option>Other</option>
              </select>
              <input className="ad-input" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="₹ / worker" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="ad-input" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
              <input className="ad-input" value={paidBy} onChange={(event) => setPaidBy(event.target.value)} placeholder="Paid by" />
            </div>
            <input className="ad-input w-full" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes (optional)" />
            <div className="rounded-lg border border-[var(--ad-border)] p-3">
              <div className="mb-2 flex justify-between text-sm font-medium"><span>Select workers</span><span>{selected.length} selected</span></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {active.map((worker) => (
                  <label key={worker.id} className="flex items-center gap-2 rounded-md p-2">
                    <input type="checkbox" checked={selected.includes(worker.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, worker.id] : selected.filter((id) => id !== worker.id))} />
                    <span>{worker.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-sm"><span>Total manual labour</span><strong>₹{total.toFixed(2)}</strong></div>
            <button className="ad-btn w-full" disabled={busy || !batchId || !selected.length || Number(amount) <= 0}>Save Attendance & Labour</button>
          </form>
        </section>
      </div>

      <section className="ad-card mt-5 p-5">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-semibold">Recent Manual Labour</h2><p className="ad-muted text-sm">Worker payments recorded for processing batches.</p></div>
          <strong>₹{labour.reduce((sum, entry) => sum + Number(entry.amount || 0), 0).toFixed(2)} total</strong>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="ad-table w-full">
            <thead><tr><th>Date</th><th>Batch</th><th>Worker</th><th>Task</th><th>Amount</th><th>Paid By</th></tr></thead>
            <tbody>
              {labour.slice(0, 100).map((entry) => (
                <tr key={entry.id}><td>{entry.payment_date}</td><td>#{entry.batch_id}</td><td>{entry.workerName}</td><td>{entry.task_type || "Manual Labour"}</td><td>₹{Number(entry.amount).toFixed(2)}</td><td>{entry.paid_by || "-"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ad-muted mt-3 text-xs">Fixed processing labour ₹2/kg remains separate.</p>
      </section>
      {message && <p className="mt-3 text-sm">{message}</p>}
    </AdminShell>
  );
}
