import { sqlite } from "@/db";

export type SiteContent = {
  mission: { en: string; hi: string };
  vision: { en: string; hi: string };
  why_us: { en: string; hi: string };
};

const KEYS = ["mission", "vision", "why_us"] as const;

const DEFAULTS: SiteContent = {
  mission: {
    en: "We transform overlooked waste into valuable resources. By collecting and refining raw discarded materials, we deliver high-quality, sustainable products while contributing to a cleaner environment.",
    hi: "हम नज़रअंदाज़ कचरे को मूल्यवान संसाधनों में बदलते हैं। कच्चे त्यागे गए पदार्थों को एकत्र और परिष्कृत कर, हम उच्च गुणवत्ता वाले, टिकाऊ उत्पाद देते हैं और स्वच्छ पर्यावरण में योगदान करते हैं।",
  },
  vision: {
    en: "We envision a world where no material is wasted. Every discarded item finds its purpose, creating a circular economy that uplifts communities and protects our planet.",
    hi: "हम एक ऐसी दुनिया की कल्पना करते हैं जहाँ कोई भी सामग्री बर्बाद न हो। हर त्यागा गया सामान अपना उद्देश्य पाए, एक चक्रीय अर्थव्यवस्था बनाकर जो समुदायों को ऊपर उठाए और हमारे ग्रह की रक्षा करे।",
  },
  why_us: {
    en: "We combine ground-level collection with advanced refinement to deliver superior recycled materials. With every partnership, you support sustainability, innovation, and a cleaner future for all.",
    hi: "हम ज़मीनी स्तर पर संग्रह को उन्नत परिष्करण के साथ जोड़कर श्रेष्ठ रीसाइकल्ड सामग्री देते हैं। हर साझेदारी के साथ आप स्थिरता, नवाचार और सबके लिए स्वच्छ भविष्य का समर्थन करते हैं।",
  },
};

function ensureTable() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value_en TEXT NOT NULL DEFAULT '',
      value_hi TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `);
  const now = new Date().toISOString();
  const insert = sqlite.prepare(
    `INSERT OR IGNORE INTO site_content (key, value_en, value_hi, updated_at) VALUES (?, ?, ?, ?)`
  );
  for (const key of KEYS) {
    insert.run(key, DEFAULTS[key].en, DEFAULTS[key].hi, now);
  }
}

export function getSiteContent(): SiteContent {
  ensureTable();
  const rows = sqlite
    .prepare(
      `SELECT key, value_en, value_hi FROM site_content WHERE key IN ('mission', 'vision', 'why_us')`
    )
    .all() as Array<{ key: string; value_en: string; value_hi: string }>;

  const map = Object.fromEntries(rows.map((r) => [r.key, { en: r.value_en, hi: r.value_hi }]));

  return {
    mission: map.mission ?? DEFAULTS.mission,
    vision: map.vision ?? DEFAULTS.vision,
    why_us: map.why_us ?? DEFAULTS.why_us,
  };
}

export function updateSiteContent(data: SiteContent) {
  ensureTable();
  const now = new Date().toISOString();
  const upsert = sqlite.prepare(
    `INSERT INTO site_content (key, value_en, value_hi, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_en = excluded.value_en, value_hi = excluded.value_hi, updated_at = excluded.updated_at`
  );
  for (const key of KEYS) {
    upsert.run(key, data[key].en, data[key].hi, now);
  }
}
