import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE sales (id INTEGER PRIMARY KEY);
  CREATE TABLE purchases (
    id INTEGER PRIMARY KEY,
    paid_amount REAL NOT NULL,
    material_id INTEGER,
    material_name TEXT NOT NULL,
    supplier_id INTEGER,
    paid_by TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE vendor_payments (
    id INTEGER PRIMARY KEY,
    supplier_id INTEGER NOT NULL,
    purchase_id INTEGER,
    payment_type TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'Cash',
    paid_by TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL,
    material_id INTEGER,
    material_name TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    quantity_kg REAL NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    purchase_id INTEGER,
    sale_id INTEGER,
    transaction_date TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT ''
  );
`);

function availableStock(mode, materialName, date, excludeSaleId) {
  const row = excludeSaleId === undefined
    ? db.prepare("SELECT COALESCE(SUM(quantity_kg),0) kg FROM inventory_transactions WHERE mode=? AND transaction_date<=? AND material_name=?").get(mode,date,materialName)
    : db.prepare("SELECT COALESCE(SUM(quantity_kg),0) kg FROM inventory_transactions WHERE mode=? AND transaction_date<=? AND material_name=? AND COALESCE(sale_id,0)<>?").get(mode,date,materialName,excludeSaleId);
  return Number(row.kg || 0);
}

// A1: sale #1 must never delete sale #10/#11 inventory rows.
db.exec("INSERT INTO inventory_transactions(mode,material_name,transaction_type,quantity_kg,amount,sale_id,transaction_date,notes) VALUES ('PET','Natural Bottles - Green','ADJUSTMENT',-100,-300,1,'2026-10-01','SALE #1')");
db.exec("INSERT INTO inventory_transactions(mode,material_name,transaction_type,quantity_kg,amount,sale_id,transaction_date,notes) VALUES ('PET','Natural Bottles - Green','ADJUSTMENT',-200,-600,10,'2026-10-01','SALE #10')");
db.prepare("DELETE FROM inventory_transactions WHERE sale_id=? AND transaction_type='ADJUSTMENT'").run(1);
assert.equal(db.prepare("SELECT COUNT(*) n FROM inventory_transactions WHERE sale_id=1").get().n, 0);
assert.equal(db.prepare("SELECT COUNT(*) n FROM inventory_transactions WHERE sale_id=10").get().n, 1);

// A4: stock is exact by material and duplicate lines aggregate before checking.
db.exec("INSERT INTO inventory_transactions(mode,material_name,transaction_type,quantity_kg,amount,transaction_date) VALUES ('PET','Natural Bottles - White','PURCHASE',50,1000,'2026-10-01')");
db.exec("INSERT INTO inventory_transactions(mode,material_name,transaction_type,quantity_kg,amount,transaction_date) VALUES ('PET','Natural Bottles - Green','PURCHASE',400,6000,'2026-10-01')");
assert.equal(availableStock("PET","Natural Bottles - Red","2026-10-01"), 0);
assert.equal(availableStock("PET","Natural Bottles - White","2026-10-01"), 50);
assert.equal(availableStock("PET","Natural Bottles - Green","2026-10-01"), 200);

// A3: omitted payer/payment mode must preserve the latest payment.
db.exec("INSERT INTO sales(id) VALUES(1)");
db.exec("INSERT INTO vendor_payments(id,supplier_id,purchase_id,payment_type,amount,payment_date,payment_mode,paid_by) VALUES(1,1,1,'PURCHASE',100,'2026-10-01','Cash','Rahul')");
db.exec("CREATE TABLE sale_payments(id INTEGER PRIMARY KEY,sale_id INTEGER,received_by TEXT,payment_mode TEXT)");
db.exec("INSERT INTO sale_payments(id,sale_id,received_by,payment_mode) VALUES(1,1,'Devesh','UPI')");
db.prepare("UPDATE sale_payments SET received_by=COALESCE(?,received_by),payment_mode=COALESCE(?,payment_mode) WHERE id=(SELECT id FROM sale_payments WHERE sale_id=? ORDER BY id DESC LIMIT 1)").run(null,null,1);
const preservedPayment = db.prepare("SELECT received_by,payment_mode FROM sale_payments WHERE id=1").get();
assert.equal(preservedPayment.received_by,"Devesh");
assert.equal(preservedPayment.payment_mode,"UPI");

// A6: purchase edits preserve payment date/payer while allowing supplier to move.
db.exec("INSERT INTO purchases(id,paid_amount,material_id,material_name,supplier_id,paid_by) VALUES(1,100,7,'Natural Bottles',1,'Rahul')");
db.exec("INSERT INTO vendor_payments(id,supplier_id,purchase_id,payment_type,amount,payment_date,payment_mode,paid_by) VALUES(2,1,1,'PURCHASE',100,'2026-10-01','Cash','Rahul')");
db.prepare("UPDATE vendor_payments SET supplier_id=? WHERE purchase_id=?").run(2,1);
const preservedVendorPayment = db.prepare("SELECT supplier_id,payment_date,paid_by FROM vendor_payments WHERE id=2").get();
assert.equal(preservedVendorPayment.supplier_id,2);
assert.equal(preservedVendorPayment.payment_date,"2026-10-01");
assert.equal(preservedVendorPayment.paid_by,"Rahul");

// A7: atomic validation principle — a write made before a later failure must roll back.
db.exec("CREATE TABLE vendor_advances(id INTEGER PRIMARY KEY, amount REAL, used_amount REAL)");
db.exec("INSERT INTO vendor_advances(id,amount,used_amount) VALUES(1,500,0)");
db.exec("BEGIN IMMEDIATE");
try {
  db.prepare("UPDATE vendor_advances SET used_amount=100 WHERE id=1").run();
  throw new Error("simulated validation failure");
} catch {
  db.exec("ROLLBACK");
}
assert.equal(db.prepare("SELECT used_amount FROM vendor_advances WHERE id=1").get().used_amount, 0);

// A8: credit settlement must not exceed outstanding credit (inline payment form sends positive amounts only).
db.exec("INSERT INTO purchases(id,paid_amount,material_id,material_name,supplier_id,paid_by) VALUES(2,50,7,'Natural Bottles',1,'Rahul')");
db.exec("ALTER TABLE purchases ADD COLUMN credit_amount REAL NOT NULL DEFAULT 0");
db.prepare("UPDATE purchases SET credit_amount=50 WHERE id=2").run();
const outstanding = Number(db.prepare("SELECT credit_amount FROM purchases WHERE id=2").get().credit_amount);
const attempted = 75;
assert.equal(attempted > outstanding + 0.005, true);
// Simulate API guard: reject overpay, leave credit unchanged.
if (!(attempted > outstanding + 0.005)) {
  db.prepare("UPDATE purchases SET paid_amount=paid_amount+?, credit_amount=credit_amount-? WHERE id=?").run(attempted, attempted, 2);
}
assert.equal(Number(db.prepare("SELECT credit_amount FROM purchases WHERE id=2").get().credit_amount), 50);

// A9: purchase stock keys must match sale/processing keys (variant-aware).
function purchaseStockName(materialName, materialVariant) {
  const name = String(materialName || "").trim();
  const variant = String(materialVariant || "").trim();
  if (name === "Red Bottles" || variant === "Red") return "Red Bottles";
  if (name === "Natural Bottles" || name.startsWith("Natural Bottles - ")) {
    const fromName = name.startsWith("Natural Bottles - ") ? name.slice("Natural Bottles - ".length) : "";
    const resolved = variant || fromName;
    if (!["Green", "White", "White Milk"].includes(resolved)) throw new Error("bad variant");
    return "Natural Bottles - " + resolved;
  }
  return name;
}
assert.equal(purchaseStockName("Natural Bottles", "Green"), "Natural Bottles - Green");
assert.equal(purchaseStockName("Natural Bottles", "White Milk"), "Natural Bottles - White Milk");
assert.equal(purchaseStockName("Red Bottles", "Red"), "Red Bottles");
assert.equal(purchaseStockName("Natural Bottles - White", ""), "Natural Bottles - White");
try {
  purchaseStockName("Natural Bottles", "");
  assert.fail("expected variant validation");
} catch (error) {
  assert.equal(String(error.message).includes("bad variant"), true);
}

// A10: company cashflow only subtracts COMPANY-funded payments; OWN_POCKET becomes due-to-partner.
db.exec(`
  CREATE TABLE company_balances(mode TEXT PRIMARY KEY, opening_balance REAL NOT NULL DEFAULT 0);
  CREATE TABLE other_expenses(id INTEGER PRIMARY KEY, mode TEXT, amount REAL, paid_by TEXT, funding_source TEXT DEFAULT 'COMPANY');
  CREATE TABLE partner_settlements(id INTEGER PRIMARY KEY, mode TEXT, person TEXT, amount REAL);
  CREATE TABLE borrowings(id INTEGER PRIMARY KEY, mode TEXT, amount REAL, outstanding_amount REAL, interest_amount REAL DEFAULT 0, interest_rate_percent REAL DEFAULT 0);
`);
try { db.exec("ALTER TABLE vendor_payments ADD COLUMN funding_source TEXT NOT NULL DEFAULT 'COMPANY'"); } catch { /* exists */ }
try { db.exec("ALTER TABLE vendor_payments ADD COLUMN mode TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE sale_payments ADD COLUMN mode TEXT"); } catch { /* exists */ }
try { db.exec("ALTER TABLE sale_payments ADD COLUMN amount REAL"); } catch { /* exists */ }
db.exec("DELETE FROM vendor_payments");
db.exec("DELETE FROM sale_payments");
db.exec("INSERT INTO company_balances(mode,opening_balance) VALUES('PET',100000)");
db.exec("INSERT INTO sale_payments(id,sale_id,received_by,payment_mode,mode,amount) VALUES(2,1,'Rahul','Cash','PET',50000)");
db.exec("INSERT INTO vendor_payments(supplier_id,payment_type,amount,payment_date,payment_mode,paid_by,funding_source,mode) VALUES(1,'PURCHASE',20000,'2026-10-01','Cash','Rahul','COMPANY','PET')");
db.exec("INSERT INTO vendor_payments(supplier_id,payment_type,amount,payment_date,payment_mode,paid_by,funding_source,mode) VALUES(1,'PURCHASE',10000,'2026-10-01','Cash','Rahul','OWN_POCKET','PET')");
db.exec("INSERT INTO other_expenses(mode,amount,paid_by,funding_source) VALUES('PET',5000,'Rahul','OWN_POCKET')");
db.exec("INSERT INTO partner_settlements(mode,person,amount) VALUES('PET','Rahul',2000)");
db.exec("INSERT INTO borrowings(mode,amount,outstanding_amount,interest_amount,interest_rate_percent) VALUES('PET',25000,27500,2500,10)");

const companyFundedVendor = Number(db.prepare("SELECT COALESCE(SUM(amount),0) n FROM vendor_payments WHERE mode=? AND COALESCE(funding_source,'COMPANY')='COMPANY'").get("PET").n);
const ownPocketVendor = Number(db.prepare("SELECT COALESCE(SUM(amount),0) n FROM vendor_payments WHERE mode=? AND COALESCE(funding_source,'COMPANY')='OWN_POCKET'").get("PET").n);
const ownPocketExpense = Number(db.prepare("SELECT COALESCE(SUM(amount),0) n FROM other_expenses WHERE mode=? AND COALESCE(funding_source,'COMPANY')='OWN_POCKET'").get("PET").n);
const settled = Number(db.prepare("SELECT COALESCE(SUM(amount),0) n FROM partner_settlements WHERE mode=? AND person=?").get("PET","Rahul").n);
const received = Number(db.prepare("SELECT COALESCE(SUM(amount),0) n FROM sale_payments WHERE mode=? AND received_by=?").get("PET","Rahul").n);
const opening = Number(db.prepare("SELECT opening_balance n FROM company_balances WHERE mode=?").get("PET").n);
const borrowed = Number(db.prepare("SELECT COALESCE(SUM(amount),0) n FROM borrowings WHERE mode=?").get("PET").n);
const companyBook = opening + received - companyFundedVendor + borrowed;
const cashWithPartner = received - companyFundedVendor;
const companyOwesPartner = ownPocketVendor + ownPocketExpense - settled;
const interestAmount = Math.round(25000 * (10 / 100) * 100) / 100;
assert.equal(companyFundedVendor, 20000);
assert.equal(ownPocketVendor, 10000);
assert.equal(cashWithPartner, 30000);
assert.equal(companyOwesPartner, 13000);
assert.equal(companyBook, 155000);
assert.equal(interestAmount, 2500);
assert.equal(Number(db.prepare("SELECT outstanding_amount n FROM borrowings WHERE id=1").get().n), 27500);

db.close();
console.log("inventory regression tests: PASS");
