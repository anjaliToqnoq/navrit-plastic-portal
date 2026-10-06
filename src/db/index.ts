import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "plastic-rates.db");

const globalForDb = globalThis as unknown as { __plasticDb?: DatabaseSync };

/**
 * Next.js spawns many workers during `next build` that all import API/page modules.
 * Opening the same SQLite file from those workers causes ERR_SQLITE_ERROR "database is locked".
 * Use in-memory DB for the entire build (set by npm script + fallbacks).
 */
function shouldUseMemoryDb() {
  return (
    process.env.NAVRIT_SQLITE_MEMORY === "1" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-export"
  );
}

function createDb() {
  const memory = shouldUseMemoryDb();

  if (!memory && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqlite = new DatabaseSync(memory ? ":memory:" : dbPath);
  sqlite.exec("PRAGMA busy_timeout = 10000;");
  if (!memory) {
    try {
      sqlite.exec("PRAGMA journal_mode = WAL;");
    } catch {
      // Ignore if another process holds the lock briefly
    }
  }
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_hi TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name_en TEXT NOT NULL,
      name_hi TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT '₹/kg',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL REFERENCES materials(id),
      rate_date TEXT NOT NULL,
      rate REAL NOT NULL,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS rate_material_date_idx
      ON rate_snapshots(material_id, rate_date);
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value_en TEXT NOT NULL DEFAULT '',
      value_hi TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      location TEXT NOT NULL DEFAULT '',
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vendor_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK(mode IN ('PET','PLASTIC')),
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
      purchase_id INTEGER REFERENCES purchases(id) ON DELETE SET NULL,
      payment_type TEXT NOT NULL CHECK(payment_type IN ('ADVANCE','PURCHASE','CREDIT_SETTLEMENT','OTHER')),
      amount REAL NOT NULL CHECK(amount > 0),
      payment_date TEXT NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'Cash',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS vendor_payments_supplier_idx
      ON vendor_payments(supplier_id, mode, payment_date);

    CREATE TABLE IF NOT EXISTS vendor_advances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK(mode IN ('PET','PLASTIC')),
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
      amount REAL NOT NULL CHECK(amount > 0),
      used_amount REAL NOT NULL DEFAULT 0 CHECK(used_amount >= 0),
      advance_date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS other_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK(mode IN ('PET','PLASTIC')),
      purchase_id INTEGER REFERENCES purchases(id) ON DELETE SET NULL,
      expense_type TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL CHECK(amount >= 0),
      expense_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lenders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS borrowings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK(mode IN ('PET','PLASTIC')),
      lender_id INTEGER NOT NULL REFERENCES lenders(id),
      amount REAL NOT NULL CHECK(amount > 0),
      outstanding_amount REAL NOT NULL CHECK(outstanding_amount >= 0),
      borrowing_date TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','PARTIAL','PAID')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS borrowing_repayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrowing_id INTEGER NOT NULL REFERENCES borrowings(id) ON DELETE CASCADE,
      amount REAL NOT NULL CHECK(amount > 0),
      repayment_date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK(mode IN ('PET','PLASTIC')),
      material_id INTEGER REFERENCES materials(id),
      material_name TEXT NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      purchase_type TEXT NOT NULL CHECK(purchase_type IN ('NORMAL','SUPPLIER_CREDIT','BORROWED_FUND')),
      quantity_kg REAL NOT NULL CHECK(quantity_kg > 0),
      rate_per_kg REAL NOT NULL CHECK(rate_per_kg >= 0),
      total_amount REAL NOT NULL CHECK(total_amount >= 0),
      paid_amount REAL NOT NULL DEFAULT 0 CHECK(paid_amount >= 0),
      credit_amount REAL NOT NULL DEFAULT 0 CHECK(credit_amount >= 0),
      lender_id INTEGER REFERENCES lenders(id),
      borrowing_id INTEGER REFERENCES borrowings(id),
      purchase_date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS purchases_mode_date_idx ON purchases(mode, purchase_date);
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK(mode IN ('PET','PLASTIC')),
      material_id INTEGER REFERENCES materials(id),
      material_name TEXT NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('PURCHASE','ADJUSTMENT')),
      quantity_kg REAL NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      purchase_id INTEGER REFERENCES purchases(id),
      transaction_date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS inventory_mode_material_idx
      ON inventory_transactions(mode, material_id, transaction_date);
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title_en TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      excerpt_en TEXT NOT NULL DEFAULT '',
      excerpt_hi TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_hi TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      published INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  for (const migration of [
    "ALTER TABLE purchases ADD COLUMN paid_by TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE vendor_payments ADD COLUMN paid_by TEXT NOT NULL DEFAULT ''",
  ]) {
    try { sqlite.exec(migration); } catch { /* column already exists */ }
  }
  seedSiteContent(sqlite);
  return sqlite;
}

const DEFAULT_CONTENT: Array<{ key: string; en: string; hi: string }> = [
  {
    key: "mission",
    en: "We transform overlooked waste into valuable resources. By collecting and refining raw discarded materials, we deliver high-quality, sustainable products while contributing to a cleaner environment.",
    hi: "हम नज़रअंदाज़ कचरे को मूल्यवान संसाधनों में बदलते हैं। कच्चे त्यागे गए पदार्थों को एकत्र और परिष्कृत कर, हम उच्च गुणवत्ता वाले, टिकाऊ उत्पाद देते हैं और स्वच्छ पर्यावरण में योगदान करते हैं।",
  },
  {
    key: "vision",
    en: "We envision a world where no material is wasted. Every discarded item finds its purpose, creating a circular economy that uplifts communities and protects our planet.",
    hi: "हम एक ऐसी दुनिया की कल्पना करते हैं जहाँ कोई भी सामग्री बर्बाद न हो। हर त्यागा गया सामान अपना उद्देश्य पाए, एक चक्रीय अर्थव्यवस्था बनाकर जो समुदायों को ऊपर उठाए और हमारे ग्रह की रक्षा करे।",
  },
  {
    key: "why_us",
    en: "We combine ground-level collection with advanced refinement to deliver superior recycled materials. With every partnership, you support sustainability, innovation, and a cleaner future for all.",
    hi: "हम ज़मीनी स्तर पर संग्रह को उन्नत परिष्करण के साथ जोड़कर श्रेष्ठ रीसाइकल्ड सामग्री देते हैं। हर साझेदारी के साथ आप स्थिरता, नवाचार और सबके लिए स्वच्छ भविष्य का समर्थन करते हैं।",
  },
];

function seedSiteContent(db: DatabaseSync) {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO site_content (key, value_en, value_hi, updated_at) VALUES (?, ?, ?, ?)`
  );
  for (const row of DEFAULT_CONTENT) {
    insert.run(row.key, row.en, row.hi, now);
  }
}

function getDb() {
  if (!globalForDb.__plasticDb) {
    globalForDb.__plasticDb = createDb();
  }
  return globalForDb.__plasticDb;
}

export const sqlite = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    const db = getDb();
    const value = Reflect.get(db, prop, db);
    return typeof value === "function" ? value.bind(db) : value;
  },
});

export type Category = {
  id: number;
  name_en: string;
  name_hi: string;
  icon: string | null;
  sort_order: number;
  active: number;
  created_at: string;
  updated_at: string;
};

export type Material = {
  id: number;
  category_id: number;
  name_en: string;
  name_hi: string;
  unit: string;
  sort_order: number;
  active: number;
  created_at: string;
  updated_at: string;
};
