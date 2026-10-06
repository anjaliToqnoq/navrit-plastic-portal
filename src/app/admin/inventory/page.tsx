/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";

import { useBusinessMode, type BusinessMode } from "@/components/business-mode-provider";

type Mode = BusinessMode;
type Material = { id:number; name_en:string; name_hi:string; category_en:string };
type Supplier = { id:number; name:string; phone:string; notes:string };
type Lender = { id:number; name:string; phone:string; notes:string };
type Purchase = {
  id:number; mode:Mode; material_name:string; purchase_type:string; quantity_kg:number;
  rate_per_kg:number; total_amount:number; paid_amount:number; credit_amount:number;
  supplierName?:string; lenderName?:string; purchase_date:string; paid_by?:string;
};
type Borrowing = { id:number; mode:Mode; lenderName:string; amount:number; outstanding_amount:number; borrowing_date:string; purpose:string };

export default function InventoryPage() {
  const { mode } = useBusinessMode();
  const [data,setData] = useState<any>(null);
  const [tab,setTab] = useState("purchases");
  const [message,setMessage] = useState("");
  const emptyPurchase = { materialId:"", materialName:"", supplierId:"", purchaseType:"NORMAL", quantityKg:"", ratePerKg:"", paidAmount:"", paidBy:"", borrowingId:"", lenderId:"", purchaseDate:new Date().toISOString().slice(0,10), notes:"" };
  const [purchase,setPurchase] = useState(emptyPurchase);
  const [editingPurchase,setEditingPurchase] = useState<number|null>(null);
  const [expense,setExpense] = useState({purchaseId:"",expenseType:"Weighing",description:"",amount:""});
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
      ratePerKg:Number(purchase.ratePerKg), paidAmount:purchase.paidAmount===""?undefined:Number(purchase.paidAmount), paidBy:purchase.paidBy||undefined,
      borrowingId:purchase.borrowingId?Number(purchase.borrowingId):undefined,
      lenderId:purchase.lenderId?Number(purchase.lenderId):undefined, purchaseDate:purchase.purchaseDate, notes:purchase.notes
    });
    if(ok)setPurchase({...emptyPurchase});
  }

  async function editPurchase() {
    if (editingPurchase===null) return;
    const m=materials.find((x:Material)=>String(x.id)===purchase.materialId);
    const ok=await post("updatePurchase",{
      purchaseId:editingPurchase, mode, materialId:m?.id, materialName:purchase.materialName||m?.name_en,
      supplierId:purchase.supplierId?Number(purchase.supplierId):undefined, purchaseType:purchase.purchaseType,
      quantityKg:Number(purchase.quantityKg), ratePerKg:Number(purchase.ratePerKg), paidBy:purchase.paidBy||undefined, purchaseDate:purchase.purchaseDate, notes:purchase.notes
    });
    if(ok){setEditingPurchase(null);setPurchase({...emptyPurchase});}
  }

  function startEditPurchase(p:Purchase) {
    setEditingPurchase(p.id);
    setPurchase({materialId:"",materialName:p.material_name,supplierId:p.supplierName ? String((data?.suppliers||[]).find((s:Supplier)=>s.name===p.supplierName)?.id||"") : "",purchaseType:p.purchase_type,quantityKg:String(p.quantity_kg),ratePerKg:String(p.rate_per_kg),paidAmount:String(p.paid_amount),paidBy:p.paid_by||"",borrowingId:"",lenderId:"",purchaseDate:p.purchase_date,notes:""});
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function addExpense() {
    if(await post("addOtherExpense",{mode,purchaseId:expense.purchaseId?Number(expense.purchaseId):undefined,expenseType:expense.expenseType,description:expense.description,amount:Number(expense.amount)})) setExpense({purchaseId:"",expenseType:"Weighing",description:"",amount:""});
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

  return <AdminShell title={mode + " Inventory & Finance"} subtitle={"Internal " + mode + " inventory, purchases, supplier credit and borrowed funds"}>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="ml-2 text-xs text-[var(--ad-muted)]">Current stock: <b>{currentKg.toFixed(2)} kg</b></span>
      {message && <span className="text-xs text-[var(--ad-accent)]">{message}</span>}
    </div>

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <div className="ad-card p-4"><p className="ad-muted text-xs">Current {mode} stock</p><p className="mt-1 text-2xl font-bold">{currentKg.toFixed(2)} kg</p></div>
      <div className="ad-card p-4"><p className="ad-muted text-xs">Outstanding borrowed</p><p className="mt-1 text-2xl font-bold">₹{openBorrowings.reduce((n:any,x:any)=>n+Number(x.outstanding_amount),0).toFixed(2)}</p></div>
      <div className="ad-card p-4"><p className="ad-muted text-xs">Supplier credit</p><p className="mt-1 text-2xl font-bold">₹{filteredPurchases.reduce((n:any,x:any)=>n+Number(x.credit_amount),0).toFixed(2)}</p></div>
    </div>

    <div className="mb-4 flex flex-wrap gap-2">
      {[["purchases","Purchases"],["inventory","Inventory"],["borrowings","Borrowings"]].map(([value,label])=><button key={value} onClick={()=>setTab(value)} className={tab===value?"ad-btn ad-btn-primary":"ad-btn ad-btn-ghost"}>{label}</button>)}
    </div>

    {tab==="purchases" && <div className="space-y-5">
      <div className="ad-card p-4">
        <h2 className="mb-3 font-semibold">{editingPurchase ? `Edit ${mode} purchase #${editingPurchase}` : `Add ${mode} purchase`}</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <select className="ad-input" value={purchase.supplierId} onChange={e=>setPurchase({...purchase,supplierId:e.target.value})}>
            <option value="">Select vendor</option>{(data.suppliers||[]).map((s:Supplier)=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="ad-input" value={purchase.materialName} onChange={e=>setPurchase({...purchase,materialName:e.target.value})}>
            <option value="">Material</option>
            <option value="Natural Bottles">Natural Bottles</option>
            <option value="Red Bottles">Red Bottles</option>
          </select>
          
          <input className="ad-input" type="date" value={purchase.purchaseDate} onChange={e=>setPurchase({...purchase,purchaseDate:e.target.value})}/>
          <input className="ad-input" type="number" placeholder="Quantity (kg)" value={purchase.quantityKg} onChange={e=>setPurchase({...purchase,quantityKg:e.target.value})}/>
          <input className="ad-input" type="number" placeholder="Rate / kg" value={purchase.ratePerKg} onChange={e=>setPurchase({...purchase,ratePerKg:e.target.value})}/>
          <span className="ad-input flex items-center text-sm">Total: ₹{((Number(purchase.quantityKg)||0)*(Number(purchase.ratePerKg)||0)).toFixed(2)}</span><input className="ad-input" type="number" min="0" placeholder="Paid to vendor" value={purchase.paidAmount} onChange={e=>setPurchase({...purchase,paidAmount:e.target.value})}/><select className="ad-input" value={purchase.paidBy} onChange={e=>setPurchase({...purchase,paidBy:e.target.value})}><option value="">Payment done by</option><option>Rahul</option><option>Devesh</option><option>Nitin</option></select>
          {purchase.purchaseType==="BORROWED_FUND" && <select className="ad-input" value={purchase.borrowingId} onChange={e=>setPurchase({...purchase,borrowingId:e.target.value})}><option value="">Select borrowing</option>{openBorrowings.map((b:Borrowing)=><option key={b.id} value={b.id}>#{b.id} {b.lenderName} — ₹{b.outstanding_amount}</option>)}</select>}
          <input className="ad-input md:col-span-2" placeholder="Notes" value={purchase.notes} onChange={e=>setPurchase({...purchase,notes:e.target.value})}/>
          <button className="ad-btn ad-btn-primary" onClick={editingPurchase ? editPurchase : addPurchase}>{editingPurchase ? "Update purchase" : "Save purchase"}</button>{editingPurchase&&<button className="ad-btn ad-btn-ghost" onClick={()=>{setEditingPurchase(null);setPurchase({...emptyPurchase})}}>Cancel</button>}
        </div>
      </div>
      <div className="ad-card p-4"><h2 className="mb-3 font-semibold">Other expense for this purchase</h2><div className="grid gap-2 md:grid-cols-5"><select className="ad-input" value={expense.purchaseId} onChange={e=>setExpense({...expense,purchaseId:e.target.value})}><option value="">Purchase</option>{filteredPurchases.map((p:Purchase)=><option key={p.id} value={p.id}>#{p.id} {p.material_name} · ₹{p.total_amount}</option>)}</select><input className="ad-input" placeholder="Expense type" value={expense.expenseType} onChange={e=>setExpense({...expense,expenseType:e.target.value})}/><input className="ad-input" placeholder="Description" value={expense.description} onChange={e=>setExpense({...expense,description:e.target.value})}/><input className="ad-input" type="number" placeholder="Expense amount" value={expense.amount} onChange={e=>setExpense({...expense,amount:e.target.value})}/><button className="ad-btn ad-btn-primary" onClick={addExpense}>Add expense</button></div></div>
      <div className="ad-table-wrap"><table className="ad-table"><thead><tr><th>Date</th><th>Vendor</th><th>Material</th><th>Qty</th><th>Rate</th><th>Total</th><th>Paid</th><th>Unpaid</th><th>Payment done by</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {filteredPurchases.map((p:Purchase)=><tr key={p.id}><td>{p.purchase_date}</td><td>{p.supplierName||"—"}</td><td>{p.material_name}</td><td>{p.quantity_kg} kg</td><td>₹{p.rate_per_kg}</td><td>₹{p.total_amount}</td><td>₹{p.paid_amount}</td><td>₹{p.credit_amount}</td><td>{Number(p.paid_amount)>0?p.paid_by||"—":"—"}</td><td>{Number(p.paid_amount)>0?"PAID":"UNPAID"}</td><td><button className="text-xs font-semibold text-[var(--ad-accent)] mr-3" onClick={()=>startEditPurchase(p)}>Edit</button>{p.credit_amount>0&&<button className="text-xs font-semibold text-[var(--ad-accent)]" onClick={async()=>{const v=prompt("Payment amount",String(p.credit_amount));if(v)await post("paySupplierCredit",{purchaseId:p.id,amount:Number(v)})}}>Pay credit</button>}</td></tr>)}
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

  </AdminShell>
}
