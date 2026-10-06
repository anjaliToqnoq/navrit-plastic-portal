/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useMemo, useState } from "react";
type Mode="PET"|"PLASTIC";
type Vendor={id:number;name:string;phone?:string;location?:string;notes?:string};
export default function VendorManagement({data,mode,post}:{data:any;mode:Mode;post:(action:string,body:any)=>Promise<boolean>}) {
  const vendors=(data?.suppliers||[]) as Vendor[];
  const purchases=(data?.purchases||[]).filter((p:any)=>p.mode===mode);
  const payments=(data?.vendorPayments||[]).filter((p:any)=>p.mode===mode);
  const summary=(data?.vendorSummary||[]).filter((v:any)=>v.mode===mode);
  const [selected,setSelected]=useState<number|null>(null);
  const [form,setForm]=useState({name:"",location:"",phone:"",notes:""});
  const [advance,setAdvance]=useState({amount:"",notes:""});
  const [payment,setPayment]=useState({amount:"",paymentMode:"Cash",notes:""});
  const vendor=vendors.find(v=>v.id===selected);
  const vs=summary.filter((v:any)=>v.id===selected);
  const vp=purchases.filter((p:any)=>p.supplier_id===selected);
  const ledger=payments.filter((p:any)=>p.supplier_id===selected);
  const totals=useMemo(()=>({kg:vp.reduce((n:any,p:any)=>n+Number(p.quantity_kg||0),0),value:vp.reduce((n:any,p:any)=>n+Number(p.total_amount||0),0),paid:vp.reduce((n:any,p:any)=>n+Number(p.paid_amount||0),0),out:vp.reduce((n:any,p:any)=>n+Number(p.credit_amount||0),0),advance:vs.reduce((n:any,v:any)=>n+Number(v.advance||0),0)}),[vp,vs]);
  async function addVendor(){if(await post("addSupplier",form))setForm({name:"",location:"",phone:"",notes:""});}
  async function addAdvance(){if(vendor&&await post("addVendorAdvance",{mode,supplierId:vendor.id,amount:Number(advance.amount),notes:advance.notes}))setAdvance({amount:"",notes:""});}
  async function makePayment(){if(vendor&&await post("payVendor",{mode,supplierId:vendor.id,amount:Number(payment.amount),paymentMode:payment.paymentMode,notes:payment.notes}))setPayment({amount:"",paymentMode:"Cash",notes:""});}
  return <div className="space-y-5">
    <div className="grid gap-5 md:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <div className="ad-card p-4"><h2 className="mb-3 font-semibold">Add New Vendor</h2>
          <input className="ad-input mb-2 w-full" placeholder="Vendor name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <input className="ad-input mb-2 w-full" placeholder="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>
          <input className="ad-input mb-2 w-full" placeholder="Contact number" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
          <input className="ad-input mb-2 w-full" placeholder="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
          <button className="ad-btn ad-btn-primary w-full" onClick={addVendor}>Add Vendor</button>
        </div>
        <div className="ad-card p-3"><h2 className="mb-2 font-semibold">Vendors</h2>{vendors.map(v=><button key={v.id} onClick={()=>setSelected(v.id)} className={"mb-1 w-full rounded-lg p-3 text-left "+(selected===v.id?"bg-[var(--ad-accent)]/10":"hover:bg-black/5")}><b>{v.name}</b><span className="block text-xs ad-muted">{v.location||"Location not added"} · {v.phone||"No phone"}</span></button>)}</div>
      </div>
      {vendor?<div className="space-y-4">
        <div className="ad-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{vendor.name}</h2><p className="ad-muted text-sm">{vendor.location||"Location not added"} · {vendor.phone||"No contact number"}</p></div><span className="rounded-full px-3 py-1 text-xs font-semibold">{mode}</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div><span className="ad-muted text-xs">Material supplied</span><b className="block">{vp.length} purchases</b></div><div><span className="ad-muted text-xs">Total weight</span><b className="block">{totals.kg.toFixed(2)} kg</b></div><div><span className="ad-muted text-xs">Purchase value</span><b className="block">₹{totals.value.toFixed(2)}</b></div><div><span className="ad-muted text-xs">Outstanding</span><b className="block">₹{totals.out.toFixed(2)}</b></div><div><span className="ad-muted text-xs">Advance balance</span><b className="block">₹{totals.advance.toFixed(2)}</b></div></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="ad-card p-4"><h3 className="mb-3 font-semibold">Give Vendor Advance</h3><input className="ad-input mb-2 w-full" type="number" placeholder="Advance amount" value={advance.amount} onChange={e=>setAdvance({...advance,amount:e.target.value})}/><input className="ad-input mb-2 w-full" placeholder="Notes" value={advance.notes} onChange={e=>setAdvance({...advance,notes:e.target.value})}/><button className="ad-btn ad-btn-primary" onClick={addAdvance}>Save Advance</button></div>
          <div className="ad-card p-4"><h3 className="mb-3 font-semibold">Make Payment</h3><input className="ad-input mb-2 w-full" type="number" placeholder="Payment amount" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})}/><select className="ad-input mb-2 w-full" value={payment.paymentMode} onChange={e=>setPayment({...payment,paymentMode:e.target.value})}><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option></select><input className="ad-input mb-2 w-full" placeholder="Notes" value={payment.notes} onChange={e=>setPayment({...payment,notes:e.target.value})}/><button className="ad-btn ad-btn-primary" onClick={makePayment}>Record Payment</button></div>
        </div>
        <div className="ad-card p-4"><h3 className="mb-3 font-semibold">Material & Purchase History</h3><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Date</th><th>Material</th><th>Qty</th><th>Rate</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>{vp.map((p:any)=><tr key={p.id}><td>{p.purchase_date}</td><td>{p.material_name}</td><td>{p.quantity_kg} kg</td><td>₹{p.rate_per_kg}</td><td>₹{p.total_amount}</td><td>₹{p.paid_amount}</td><td>₹{p.credit_amount}</td></tr>)}</tbody></table></div></div>
        <div className="ad-card p-4"><h3 className="mb-3 font-semibold">Payment / Transaction History</h3><div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Mode</th><th>Material</th><th>Notes</th></tr></thead><tbody>{ledger.map((p:any)=><tr key={p.id}><td>{p.payment_date}</td><td>{p.payment_type}</td><td>₹{p.amount}</td><td>{p.payment_mode}</td><td>{p.materialName||"—"}</td><td>{p.notes||"—"}</td></tr>)}</tbody></table></div></div>
      </div>:<div className="ad-card flex min-h-[300px] items-center justify-center p-6 ad-muted">Select a vendor to view complete details.</div>}
    </div>
  </div>;
}