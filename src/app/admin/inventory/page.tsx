/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, adminToast } from "@/components/admin-shell";

type Mode = "PET" | "PLASTIC";
type Material = { id:number; name_en:string; name_hi:string; category_en:string };
type Supplier = { id:number; name:string; phone:string; notes:string };
type Lender = { id:number; name:string; phone:string; notes:string };
type Purchase = {
  id:number; mode:Mode; material_name:string; purchase_type:string; quantity_kg:number;
  rate_per_kg:number; total_amount:number; paid_amount:number; credit_amount:number;
  supplierName?:string; lenderName?:string; purchase_date:string;
};
type Borrowing = { id:number; mode:Mode; lenderName:string; amount:number; outstanding_amount:number; borrowing_date:string; purpose:string };

export default function InventoryPage() {
  const [mode,setMode] = useState<Mode>("PET");
  const [data,setData] = useState<any>(null);
  const [tab,setTab] = useState("purchases");
  const [message,setMessage] = useState("");
  const [purchase,setPurchase] = useState({
    materialId:"", materialName:"", supplierId:"", purchaseType:"NORMAL",
    quantityKg:"", ratePerKg:"", paidAmount:"", borrowingId:"", lenderId:"", notes:""
  });
  const [newParty,setNewParty] = useState({name:"",phone:"",notes:""});
  const [borrowing,setBorrowing] = useState({lenderId:"",amount:"",purpose:"",notes:""});
  const [repay,setRepay] = useState({borrowingId:"",amount:""});
  const [adjust,setAdjust] = useState({materialId:"",materialName:"",quantityKg:"",amount:"",notes:""});

  async function load() {
    const r=await fetch("/api/admin/inventory");
    if(r.status===401){window.location.href="/admin/login";return;}
    setData(await r.json());
  }
  useEffect(()=>{load()},[]);

  const materials = useMemo(()=> (data?.materials||[]).filter((m:Material)=>m.id),[data]);
  const filteredInventory=(data?.inventory||[]).filter((x:any)=>x.mode===mode);
  const filteredPurchases=(data?.purchases||[]).filter((x:Purchase)=>x.mode===mode);
  const filteredBorrowings=(data?.borrowings||[]).filter((x:Borrowing)=>x.mode===mode);
  const openBorrowings=filteredBorrowings.filter((x:Borrowing)=>x.outstanding_amount>0);
  const currentKg=filteredInventory.reduce((n:any,x:any)=>n+Number(x.quantityKg||0),0);

  async function post(action:string, body:any) {
    const r=await fetch("/api/admin/inventory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...body})});
    const j=await r.json();
    if(!r.ok){setMessage(j.error||"Operation failed");return false;}
    setMessage("Saved successfully");
    await load();
    return true;
  }

  async function addPurchase() {
    const m=materials.find((x:Material)=>String(x.id)===purchase.materialId);
    const ok=await post("addPurchase",{
      mode, materialId:m?.id, materialName:purchase.materialName||m?.name_en,
      supplierId:purchase.supplierId?Number(purchase.supplierId):undefined,
      purchaseType:purchase.purchaseType, quantityKg:Number(purchase.quantityKg),
      ratePerKg:Number(purchase.ratePerKg), paidAmount:purchase.paidAmount===""?undefined:Number(purchase.paidAmount),
      borrowingId:purchase.borrowingId?Number(purchase.borrowingId):undefined,
      lenderId:purchase.lenderId?Number(purchase.lenderId):undefined, notes:purchase.notes
    });
    if(ok)setPurchase({materialId:"",materialName:"",supplierId:"",purchaseType:"NORMAL",quantityKg:"",ratePerKg:"",paidAmount:"",borrowingId:"",lenderId:"",notes:""});
  }

  async function addParty(action:string) {
    if(await post(action,newParty)) setNewParty({name:"",phone:"",notes:""});
  }

  async function addBorrowing() {
    if(await post("addBorrowing",{...borrowing,mode,lenderId:Number(borrowing.lenderId),amount:Number(borrowing.amount)}))
      setBorrowing({lenderId:"",amount:"",purpose:"",notes:""});
  }

  async function repayBorrowing() {
    if(await post("repayBorrowing",{borrowingId:Number(repay.borrowingId),amount:Number(repay.amount)}))
      setRepay({borrowingId:"",amount:""});
  }

  async function adjustInventory() {
    if(await post("adjustInventory",{...adjust,mode,materialId:adjust.materialId?Number(adjust.materialId):undefined,quantityKg:Number(adjust.quantityKg),amount:Number(adjust.amount||0)}))
      setAdjust({materialId:"",materialName:"",quantityKg:"",amount:"",notes:""});
  }

  if(!data) return <AdminShell title="Inventory & Finance"><div className="ad-card p-6">Loading…</div></AdminShell>;

  return <AdminShell title="Inventory & Finance" subtitle="Separate PET and Plastic inventory, purchases, supplier credit and borrowed funds">
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <button onClick={()=>setMode("PET")} className={mode==="PET"?"ad-btn ad-btn-primary":"ad-btn ad-btn-ghost"}>PET</button>
      <button onClick={()=>setMode("PLASTIC")} className={mode==="PLASTIC"?"ad-btn ad-btn-primary":"ad-btn ad-btn-ghost"}>Plastic</button>
      <span className="ml-2 text-xs text-[var(--ad-muted)]">Current stock: <b>{currentKg.toFixed(2)} kg</b></span>
      {message && <span className="text-xs text-[var(--ad-accent)]">{message}</span>}
    </div>

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <div className="ad-card p-4"><p className="ad-muted text-xs">Current {mode} stock</p><p className="mt-1 text-2xl font-bold">{currentKg.toFixed(2)} kg</p></div>
      <div className="ad-card p-4"><p className="ad-muted text-xs">Outstanding borrowed</p><p className="mt-1 text-2xl font-bold">₹{openBorrowings.reduce((n:any,x:any)=>n+Number(x.outstanding_amount),0).toFixed(2)}</p></div>
      <div className="ad-card p-4"><p className="ad-muted text-xs">Supplier credit</p><p className="mt-1 text-2xl font-bold">₹{filteredPurchases.reduce((n:any,x:any)=>n+Number(x.credit_amount),0).toFixed(2)}</p></div>
    </div>

    <div className="mb-4 flex flex-wrap gap-2">
      {["purchases","inventory","borrowings","parties"].map(x=><button key={x} onClick={()=>setTab(x)} className={tab===x?"ad-btn ad-btn-primary":"ad-btn ad-btn-ghost"}>{x[0].toUpperCase()+x.slice(1)}</button>)}
    </div>

    {tab==="purchases" && <div className="space-y-5">
      <div className="ad-card p-4">
        <h2 className="mb-3 font-semibold">Add {mode} purchase</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <select className="ad-input" value={purchase.materialId} onChange={e=>setPurchase({...purchase,materialId:e.target.value,materialName:""})}>
            <option value="">Select material</option>
            {materials.map((m:Material)=><option key={m.id} value={m.id}>{m.name_en}</option>)}
          </select>
          <input className="ad-input" placeholder="Or material name" value={purchase.materialName} onChange={e=>setPurchase({...purchase,materialName:e.target.value})}/>
          <select className="ad-input" value={purchase.purchaseType} onChange={e=>setPurchase({...purchase,purchaseType:e.target.value})}>
            <option value="NORMAL">Normal purchase</option><option value="SUPPLIER_CREDIT">Supplier credit / consignment</option><option value="BORROWED_FUND">Borrowed-fund purchase</option>
          </select>
          <select className="ad-input" value={purchase.supplierId} onChange={e=>setPurchase({...purchase,supplierId:e.target.value})}>
            <option value="">Supplier (optional)</option>{(data.suppliers||[]).map((s:Supplier)=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="ad-input" type="number" placeholder="Quantity (kg)" value={purchase.quantityKg} onChange={e=>setPurchase({...purchase,quantityKg:e.target.value})}/>
          <input className="ad-input" type="number" placeholder="Rate / kg" value={purchase.ratePerKg} onChange={e=>setPurchase({...purchase,ratePerKg:e.target.value})}/>
          <input className="ad-input" type="number" placeholder="Paid amount (optional)" value={purchase.paidAmount} onChange={e=>setPurchase({...purchase,paidAmount:e.target.value})}/>
          {purchase.purchaseType==="BORROWED_FUND" && <select className="ad-input" value={purchase.borrowingId} onChange={e=>setPurchase({...purchase,borrowingId:e.target.value})}><option value="">Select borrowing</option>{openBorrowings.map((b:Borrowing)=><option key={b.id} value={b.id}>#{b.id} {b.lenderName} — ₹{b.outstanding_amount}</option>)}</select>}
          <input className="ad-input md:col-span-2" placeholder="Notes" value={purchase.notes} onChange={e=>setPurchase({...purchase,notes:e.target.value})}/>
          <button className="ad-btn ad-btn-primary" onClick={addPurchase}>Save purchase</button>
        </div>
      </div>
      <div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Date</th><th>Material</th><th>Type</th><th>Qty</th><th>Total</th><th>Paid</th><th>Credit</th><th>Action</th></tr></thead><tbody>
        {filteredPurchases.map((p:Purchase)=><tr key={p.id}><td>{p.purchase_date}</td><td>{p.material_name}</td><td>{p.purchase_type}</td><td>{p.quantity_kg} kg</td><td>₹{p.total_amount}</td><td>₹{p.paid_amount}</td><td>₹{p.credit_amount}</td><td>{p.credit_amount>0&&<button className="text-xs font-semibold text-[var(--ad-accent)]" onClick={async()=>{const v=prompt("Payment amount",String(p.credit_amount));if(v)await post("paySupplierCredit",{purchaseId:p.id,amount:Number(v)})}}>Pay credit</button>}</td></tr>)}
      </tbody></table></div>
    </div>}

    {tab==="inventory" && <div className="space-y-5">
      <div className="ad-card p-4"><h2 className="mb-3 font-semibold">Inventory adjustment</h2><div className="grid gap-2 md:grid-cols-5">
        <select className="ad-input" value={adjust.materialId} onChange={e=>setAdjust({...adjust,materialId:e.target.value,materialName:""})}><option value="">Material</option>{materials.map((m:Material)=><option key={m.id} value={m.id}>{m.name_en}</option>)}</select>
        <input className="ad-input" placeholder="Material name" value={adjust.materialName} onChange={e=>setAdjust({...adjust,materialName:e.target.value})}/>
        <input className="ad-input" type="number" placeholder="+/- kg" value={adjust.quantityKg} onChange={e=>setAdjust({...adjust,quantityKg:e.target.value})}/>
        <input className="ad-input" type="number" placeholder="Value" value={adjust.amount} onChange={e=>setAdjust({...adjust,amount:e.target.value})}/>
        <button className="ad-btn ad-btn-primary" onClick={adjustInventory}>Save adjustment</button>
      </div><input className="ad-input mt-2 w-full" placeholder="Reason / notes (required)" value={adjust.notes} onChange={e=>setAdjust({...adjust,notes:e.target.value})}/></div>
      <div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Material</th><th>Mode</th><th>Quantity</th><th>Value</th></tr></thead><tbody>{filteredInventory.map((x:any)=><tr key={x.mode+"-"+x.materialId}><td>{x.materialName}</td><td>{x.mode}</td><td>{Number(x.quantityKg).toFixed(2)} kg</td><td>₹{Number(x.value).toFixed(2)}</td></tr>)}</tbody></table></div>
    </div>}

    {tab==="borrowings" && <div className="space-y-5">
      <div className="ad-card p-4"><h2 className="mb-3 font-semibold">Borrow funds for {mode}</h2><div className="grid gap-2 md:grid-cols-4">
        <select className="ad-input" value={borrowing.lenderId} onChange={e=>setBorrowing({...borrowing,lenderId:e.target.value})}><option value="">Lender</option>{(data.lenders||[]).map((l:Lender)=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <input className="ad-input" type="number" placeholder="Amount" value={borrowing.amount} onChange={e=>setBorrowing({...borrowing,amount:e.target.value})}/>
        <input className="ad-input" placeholder="Purpose" value={borrowing.purpose} onChange={e=>setBorrowing({...borrowing,purpose:e.target.value})}/>
        <button className="ad-btn ad-btn-primary" onClick={addBorrowing}>Add borrowing</button>
      </div></div>
      <div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Date</th><th>Lender</th><th>Amount</th><th>Outstanding</th><th>Action</th></tr></thead><tbody>{filteredBorrowings.map((b:Borrowing)=><tr key={b.id}><td>{b.borrowing_date}</td><td>{b.lenderName}</td><td>₹{b.amount}</td><td>₹{b.outstanding_amount}</td><td>{b.outstanding_amount>0&&<button className="text-xs font-semibold text-[var(--ad-accent)]" onClick={async()=>{const v=prompt("Repayment amount",String(b.outstanding_amount));if(v)await post("repayBorrowing",{borrowingId:b.id,amount:Number(v)})}}>Repay</button>}</td></tr>)}</tbody></table></div>
    </div>}

    {tab==="parties" && <div className="grid gap-5 md:grid-cols-2">
      <div className="ad-card p-4"><h2 className="mb-3 font-semibold">Add supplier</h2><input className="ad-input mb-2" placeholder="Name" value={newParty.name} onChange={e=>setNewParty({...newParty,name:e.target.value})}/><input className="ad-input mb-2" placeholder="Phone" value={newParty.phone} onChange={e=>setNewParty({...newParty,phone:e.target.value})}/><button className="ad-btn ad-btn-primary" onClick={()=>addParty("addSupplier")}>Save supplier</button></div>
      <div className="ad-card p-4"><h2 className="mb-3 font-semibold">Add lender</h2><input className="ad-input mb-2" placeholder="Name" value={newParty.name} onChange={e=>setNewParty({...newParty,name:e.target.value})}/><input className="ad-input mb-2" placeholder="Phone" value={newParty.phone} onChange={e=>setNewParty({...newParty,phone:e.target.value})}/><button className="ad-btn ad-btn-primary" onClick={()=>addParty("addLender")}>Save lender</button></div>
    </div>}
  </AdminShell>
}
