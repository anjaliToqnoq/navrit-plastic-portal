import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { sqlite } from "@/db";
import { listMaterials, nowIso, todayStr } from "@/lib/rates";

export const dynamic = "force-dynamic";

async function guard() {
  return await getSession();
}

const modeSchema = z.enum(["PET", "PLASTIC"]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function json<T>(value: T) {
  return NextResponse.json(JSON.parse(JSON.stringify(value)));
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const materials = listMaterials(true);
  const suppliers = sqlite.prepare("SELECT * FROM suppliers ORDER BY name").all();
  const lenders = sqlite.prepare("SELECT * FROM lenders ORDER BY name").all();

  const inventory = sqlite.prepare(`
    SELECT mode, material_id as materialId, material_name as materialName,
           ROUND(SUM(quantity_kg), 3) as quantityKg,
           ROUND(SUM(amount), 2) as value
    FROM inventory_transactions
    GROUP BY mode, material_id, material_name
    HAVING ABS(SUM(quantity_kg)) > 0.0001
    ORDER BY mode, materialName
  `).all();

  const purchases = sqlite.prepare(`
    SELECT p.*, s.name as supplierName, l.name as lenderName
    FROM purchases p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    LEFT JOIN lenders l ON l.id = p.lender_id
    ORDER BY p.purchase_date DESC, p.id DESC
    LIMIT 100
  `).all();

  const borrowings = sqlite.prepare(`
    SELECT b.*, l.name as lenderName
    FROM borrowings b JOIN lenders l ON l.id = b.lender_id
    ORDER BY b.borrowing_date DESC, b.id DESC
    LIMIT 100
  `).all();

  const supplierCredit = sqlite.prepare(`
    SELECT s.id, s.name, ROUND(SUM(p.credit_amount),2) as outstanding
    FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.credit_amount > 0
    GROUP BY s.id, s.name
    HAVING SUM(p.credit_amount) > 0.005
    ORDER BY outstanding DESC
  `).all();

  const vendorSummary = sqlite.prepare(`
    SELECT
      s.id,
      s.name,
      m.mode,
      ROUND(COALESCE(p.totalKg, 0), 2) as totalKg,
      ROUND(COALESCE(p.totalPurchase, 0), 2) as totalPurchase,
      ROUND(COALESCE(p.totalPaid, 0), 2) as totalPaid,
      ROUND(COALESCE(p.unpaid, 0), 2) as unpaid,
      ROUND(COALESCE(a.advance, 0), 2) as advance
    FROM suppliers s
    CROSS JOIN (SELECT 'PET' AS mode UNION ALL SELECT 'PLASTIC' AS mode) m
    LEFT JOIN (
      SELECT supplier_id, mode,
        SUM(quantity_kg) as totalKg,
        SUM(total_amount) as totalPurchase,
        SUM(paid_amount) as totalPaid,
        SUM(credit_amount) as unpaid
      FROM purchases
      GROUP BY supplier_id, mode
    ) p ON p.supplier_id=s.id AND p.mode=m.mode
    LEFT JOIN (
      SELECT supplier_id, mode, SUM(amount-used_amount) as advance
      FROM vendor_advances
      GROUP BY supplier_id, mode
    ) a ON a.supplier_id=s.id AND a.mode=m.mode
    ORDER BY s.name, m.mode
  `).all();

  const totals = sqlite.prepare(`
    SELECT
      ROUND(COALESCE(SUM(CASE WHEN mode='PET' THEN quantity_kg ELSE 0 END),0),3) as petKg,
      ROUND(COALESCE(SUM(CASE WHEN mode='PLASTIC' THEN quantity_kg ELSE 0 END),0),3) as plasticKg
    FROM inventory_transactions
  `).get();

  return json({ materials, suppliers, lenders, inventory, purchases, borrowings, supplierCredit, vendorSummary, totals });
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

  try {
    if (body.action === "addSupplier" || body.action === "addLender") {
      const s = z.object({
        name: z.string().trim().min(1),
        phone: z.string().trim().optional().default(""),
        notes: z.string().trim().optional().default(""),
      }).parse(body);
      const table = body.action === "addSupplier" ? "suppliers" : "lenders";
      const r = sqlite.prepare(`INSERT INTO ${table} (name, phone, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
        .run(s.name, s.phone, s.notes, nowIso(), nowIso());
      return json({ ok: true, id: Number(r.lastInsertRowid) });
    }

    if (body.action === "addVendorAdvance") {
      const x = z.object({
        mode: modeSchema, supplierId: z.number().int().positive(), amount: z.number().positive(),
        advanceDate: dateSchema.optional().default(todayStr()), notes: z.string().trim().optional().default("")
      }).parse(body);
      sqlite.prepare(`INSERT INTO vendor_advances (mode,supplier_id,amount,used_amount,advance_date,notes,created_at,updated_at) VALUES (?,?,?,0,?,?,?,?)`)
        .run(x.mode,x.supplierId,x.amount,x.advanceDate,x.notes,nowIso(),nowIso());
      return json({ok:true});
    }

    if (body.action === "addOtherExpense") {
      const x = z.object({
        mode: modeSchema, purchaseId: z.number().int().positive().optional(), expenseType: z.string().trim().min(1),
        description: z.string().trim().optional().default(""), amount: z.number().nonnegative(),
        expenseDate: dateSchema.optional().default(todayStr())
      }).parse(body);
      sqlite.prepare(`INSERT INTO other_expenses (mode,purchase_id,expense_type,description,amount,expense_date,created_at) VALUES (?,?,?,?,?,?,?)`)
        .run(x.mode,x.purchaseId??null,x.expenseType,x.description,x.amount,x.expenseDate,nowIso());
      return json({ok:true});
    }

    if (body.action === "addBorrowing") {
      const s = z.object({
        mode: modeSchema,
        lenderId: z.number().int().positive(),
        amount: z.number().positive(),
        borrowingDate: dateSchema.optional().default(todayStr()),
        purpose: z.string().trim().optional().default(""),
        notes: z.string().trim().optional().default(""),
      }).parse(body);
      const r = sqlite.prepare(`
        INSERT INTO borrowings
        (mode, lender_id, amount, outstanding_amount, borrowing_date, purpose, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
      `).run(s.mode, s.lenderId, s.amount, s.amount, s.borrowingDate, s.purpose, s.notes, nowIso(), nowIso());
      return json({ ok: true, id: Number(r.lastInsertRowid) });
    }

    if (body.action === "repayBorrowing") {
      const s = z.object({
        borrowingId: z.number().int().positive(),
        amount: z.number().positive(),
        repaymentDate: dateSchema.optional().default(todayStr()),
        notes: z.string().trim().optional().default(""),
      }).parse(body);
      const b = sqlite.prepare("SELECT * FROM borrowings WHERE id = ?").get(s.borrowingId) as { outstanding_amount: number } | undefined;
      if (!b) return NextResponse.json({ error: "Borrowing not found" }, { status: 404 });
      if (s.amount > b.outstanding_amount + 0.005) return NextResponse.json({ error: "Repayment exceeds outstanding amount" }, { status: 400 });
      const outstanding = Math.max(0, b.outstanding_amount - s.amount);
      sqlite.prepare(`
        INSERT INTO borrowing_repayments (borrowing_id, amount, repayment_date, notes, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(s.borrowingId, s.amount, s.repaymentDate, s.notes, nowIso());
      sqlite.prepare("UPDATE borrowings SET outstanding_amount=?, status=?, updated_at=? WHERE id=?")
        .run(outstanding, outstanding === 0 ? "PAID" : "PARTIAL", nowIso(), s.borrowingId);
      return json({ ok: true, outstanding });
    }

    if (body.action === "addPurchase") {
      const s = z.object({
        mode: modeSchema,
        materialId: z.number().int().positive().optional(),
        materialName: z.string().trim().min(1),
        supplierId: z.number().int().positive().optional(),
        purchaseType: z.enum(["NORMAL", "SUPPLIER_CREDIT", "BORROWED_FUND"]),
        quantityKg: z.number().positive(),
        ratePerKg: z.number().nonnegative(),
        paidAmount: z.number().nonnegative().optional(),
        lenderId: z.number().int().positive().optional(),
        borrowingId: z.number().int().positive().optional(),
        purchaseDate: dateSchema.optional().default(todayStr()),
        notes: z.string().trim().optional().default(""),
      }).parse(body);

      const total = Math.round(s.quantityKg * s.ratePerKg * 100) / 100;
      let paid = s.paidAmount ?? (s.purchaseType === "SUPPLIER_CREDIT" ? 0 : total);
      if (paid > total) paid = total;
      let credit = Math.round((total - paid) * 100) / 100;

      if (!s.supplierId) {
        return NextResponse.json({ error: "Vendor is required for every purchase" }, { status: 400 });
      }
      if (s.purchaseType === "SUPPLIER_CREDIT" && !s.supplierId) {
        return NextResponse.json({ error: "Supplier is required for supplier credit" }, { status: 400 });
      }
      if (s.purchaseType === "BORROWED_FUND" && !s.borrowingId) {
        return NextResponse.json({ error: "Borrowing account is required for borrowed-fund purchase" }, { status: 400 });
      }

      const r = sqlite.prepare(`
        INSERT INTO purchases
        (mode, material_id, material_name, supplier_id, purchase_type, quantity_kg, rate_per_kg,
         total_amount, paid_amount, credit_amount, lender_id, borrowing_id, purchase_date, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        s.mode, s.materialId ?? null, s.materialName, s.supplierId ?? null, s.purchaseType,
        s.quantityKg, s.ratePerKg, total, paid, credit, s.lenderId ?? null, s.borrowingId ?? null,
        s.purchaseDate, s.notes, nowIso(), nowIso()
      );
      const purchaseId = Number(r.lastInsertRowid);

      sqlite.prepare(`
        INSERT INTO inventory_transactions
        (mode, material_id, material_name, transaction_type, quantity_kg, amount, purchase_id, transaction_date, notes, created_at)
        VALUES (?, ?, ?, 'PURCHASE', ?, ?, ?, ?, ?, ?)
      `).run(s.mode, s.materialId ?? null, s.materialName, s.quantityKg, total, purchaseId, s.purchaseDate, s.notes, nowIso());

      return json({ ok: true, id: purchaseId, total, paid, credit });
    }

    if (body.action === "paySupplierCredit") {
      const s = z.object({
        purchaseId: z.number().int().positive(),
        amount: z.number().positive(),
      }).parse(body);
      const p = sqlite.prepare("SELECT credit_amount FROM purchases WHERE id=?").get(s.purchaseId) as { credit_amount:number } | undefined;
      if (!p) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
      if (s.amount > p.credit_amount + 0.005) return NextResponse.json({ error: "Payment exceeds outstanding credit" }, { status: 400 });
      sqlite.prepare("UPDATE purchases SET paid_amount=paid_amount+?, credit_amount=credit_amount-?, updated_at=? WHERE id=?")
        .run(s.amount, s.amount, nowIso(), s.purchaseId);
      return json({ ok: true });
    }

    if (body.action === "adjustInventory") {
      const s = z.object({
        mode: modeSchema,
        materialId: z.number().int().positive().optional(),
        materialName: z.string().trim().min(1),
        quantityKg: z.number(),
        amount: z.number().default(0),
        transactionDate: dateSchema.optional().default(todayStr()),
        notes: z.string().trim().min(1),
      }).parse(body);
      sqlite.prepare(`
        INSERT INTO inventory_transactions
        (mode, material_id, material_name, transaction_type, quantity_kg, amount, transaction_date, notes, created_at)
        VALUES (?, ?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?)
      `).run(s.mode, s.materialId ?? null, s.materialName, s.quantityKg, s.amount, s.transactionDate, s.notes, nowIso());
      return json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues[0]?.message || "Invalid data" }, { status: 400 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Operation failed" }, { status: 500 });
  }
}
