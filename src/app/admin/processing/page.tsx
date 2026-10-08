"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useBusinessMode } from "@/components/business-mode-provider";

type Worker={id:number;name:string;active:number};
type Batch={id:number;mode:string;batch_date:string;total_input_kg:number;status:string};
type Labour={id:number;batch_id:number;workerName:string;amount:number;payment_date:string;paid_by:string;task_type:string;mode:string};

export default function ProcessingPage(){
 const {mode}=useBusinessMode();
 const [workers,setWorkers]=useState<Worker[]>([]),[batches,setBatches]=useState<Batch[]>([]),[labour,setLabour]=useState<Labour[]>([]);
 const today=new Date().toISOString().slice(0,10);
 const [name,setName]=useState(""),[batchId,setBatchId]=useState(""),[taskType,setTaskType]=useState("Cap Removal"),[amount,setAmount]=useState(""),[paymentDate,setPaymentDate]=useState(today),[paidBy,setPaidBy]=useState(""),[notes,setNotes]=useState(""),[selected,setSelected]=useState<number[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function load(){const r=await fetch("/api/admin/inventory?mode="+mode,{cache:"no-store"});const j=await r.json();setWorkers(j.labourWorkers||[]);setBatches((j.processingBatches||[]).filter((b:Batch)=>b.mode===mode&&b.status!=="CANCELLED"));setLabour((j.manualLabour||[]).filter((x:Labour)=>x.mode===mode))}
 useEffect(()=>{load()},[mode]);
 const active=workers.filter(w=>w.active), total=useMemo(()=>selected.length*Number(amount||0),[selected,amount]);
 async function post(body:any){setBusy(true);setMessage("");try{const r=await fetch("/api/admin/inventory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error||"Something went wrong");await load();setMessage("Saved successfully.");return true}catch(e:any){setMessage(e.message);return false}finally{setBusy(false)}}
 async function addWorker(e:FormEvent){e.preventDefault();if(await post({action:"addLabourWorker",name}))setName("")}
 async function save(e:FormEvent){e.preventDefault();if(!batchId||!selected.length||Number(amount)<=0){setMessage("Select a batch, workers and amount.");return}if(await post({action:"addManualLabour",mode,batchId:Number(batchId),workerIds:selected,taskType,amountPerWorker:Number(amount),paymentDate,paidBy,notes})){setSelected([]);setAmount("");setBatchId("");setPaymentDate(today);setPaidBy("");setNotes("")}}
 return <AdminShell title="Processing" subtitle="Processing and manual labour management">
  <div className="grid gap-5 lg:grid-cols-2">
   <section className="ad-card p-5"><h2 className="text-lg font-semibold">Labour Management</h2><p className="ad-muted mt-1 text-sm">Add workers once and disable them when they leave.</p>
    <form onSubmit={addWorker} className="mt-4 flex gap-2"><input className="ad-input flex-1" value={name} onChange={e=>setName(e.target.value)} placeholder="Worker name"/><button className="ad-btn" disabled={busy||!name.trim()}>+ Add Worker</button></form>
    <div className="mt-4 space-y-2">{active.map(w=><div key={w.id} className="flex items-center justify-between rounded-lg border border-[var(--ad-border)] p-3"><span>{w.name}</span><button className="ad-btn-secondary text-xs" disabled={busy} onClick={()=>post({action:"setLabourWorkerStatus",workerId:w.id,active:false})}>Disable</button></div>)}{!active.length&&<p className="ad-muted text-sm">No active workers.</p>}</div>
   </section>
   <section className="ad-card p-5"><h2 className="text-lg font-semibold">Manual Labour Attendance</h2><p className="ad-muted mt-1 text-sm">Record workers against a processing batch.</p>
    <form onSubmit={save} className="mt-4 space-y-3">
     <select className="ad-input w-full" value={batchId} onChange={e=>setBatchId(e.target.value)}><option value="">Select processing batch</option>{batches.map(b=><option key={b.id} value={b.id}>#{b.id} · {b.batch_date} · {b.total_input_kg} kg</option>)}</select>
     <div className="grid grid-cols-2 gap-3"><select className="ad-input" value={taskType} onChange={e=>setTaskType(e.target.value)}><option>Cap Removal</option><option>Sorting</option><option>Other</option></select><input className="ad-input" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="₹ / worker"/></div>
     <div className="grid grid-cols-2 gap-3"><input className="ad-input" type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/><input className="ad-input" value={paidBy} onChange={e=>setPaidBy(e.target.value)} placeholder="Paid by"/></div>
     <input className="ad-input w-full" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (optional)"/>
     <div className="rounded-lg border border-[var(--ad-border)] p-3"><div className="mb-2 flex justify-between text-sm font-medium"><span>Select workers</span><span>{selected.length} selected</span></div><div className="grid gap-2 sm:grid-cols-2">{active.map(w=><label key={w.id} className="flex items-center gap-2 rounded-md p-2"><input type="checkbox" checked={selected.includes(w.id)} onChange={e=>setSelected(e.target.checked?[...selected,w.id]:selected.filter(id=>id!==w.id))}/><span>{w.name}</span></label>)}</div></div>
     <div className="flex justify-between text-sm"><span>Total manual labour</span><strong>₹{total.toFixed(2)}</strong></div><button className="ad-btn w-full" disabled={busy||!batchId||!selected.length||Number(amount)<=0}>Save Attendance & Labour</button>
    </form>
   </section>
  </div>
  <section className="ad-card mt-5 p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Recent Manual Labour</h2><p className="ad-muted text-sm">Worker payments recorded for processing batches.</p></div><strong>₹{labour.reduce((n,x)=>n+Number(x.amount||0),0).toFixed(2)} total</strong></div>
   <div className="mt-4 overflow-x-auto"><table className="ad-table w-full"><thead><tr><th>Date</th><th>Batch</th><th>Worker</th><th>Task</th><th>Amount</th><th>Paid By</th></tr></thead><tbody>{labour.slice(0,100).map(x=><tr key={x.id}><td>{x.payment_date}</td><td>#{x.batch_id}</td><td>{x.workerName}</td><td>{x.task_type||"Manual Labour"}</td><td>₹{Number(x.amount).toFixed(2)}</td><td>{x.paid_by||"-"}</td></tr>)}</tbody></table></div>
   <p className="ad-muted mt-3 text-xs">Fixed processing labour ₹2/kg remains separate.</p>
  </section>
  {message&&<p className="mt-3 text-sm">{message}</p>}
 </AdminShell>
}