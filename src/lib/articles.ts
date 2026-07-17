import { sqlite } from "@/db";
import { syncArticleImages } from "@/lib/fix-article-images";

export type Article = {
  id: number;
  slug: string;
  title_en: string;
  title_hi: string;
  excerpt_en: string;
  excerpt_hi: string;
  body_en: string;
  body_hi: string;
  image_url: string | null;
  published: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const SEED: Array<{
  slug: string;
  titleEn: string;
  titleHi: string;
  excerptEn: string;
  excerptHi: string;
  bodyEn: string;
  bodyHi: string;
  image: string;
  publishedAt: string;
}> = [
  {
    slug: "transparent-daily-rates-build-trust",
    titleEn: "Why transparent daily rates build vendor trust",
    titleHi: "पारदर्शी दैनिक रेट से विक्रेता का विश्वास कैसे बढ़ता है",
    excerptEn:
      "When purchase prices are published clearly every day, sellers can plan with confidence — and partnerships last longer.",
    excerptHi:
      "जब खरीद कीमतें हर दिन स्पष्ट रूप से प्रकाशित होती हैं, विक्रेता विश्वास के साथ योजना बना सकते हैं।",
    image: "/articles/rates.svg",
    publishedAt: "2026-07-08",
    bodyEn: `In the plastic recycling trade, trust is currency. Vendors who collect PET bottles, PP containers, or mixed scrap need to know what their material is worth — today, not “sometime later.”

At NAVRIT, we publish purchase rates every day so sellers do not depend on rumours or last-minute negotiations. A clear rate board helps small collectors decide when to sell, how to sort, and which materials to prioritise.

Transparency also protects both sides. When the price for PET flakes or HDPE drums is visible, disputes reduce. Buyers and sellers share the same numbers. Over weeks and months, that habit builds a reputation that no slogan can replace.

If you are a vendor in our network, check today’s board, compare categories, and sell with confidence. Fair rates are not a favour — they are how a circular business stays honest.`,
    bodyHi: `प्लास्टिक रीसाइक्लिंग में विश्वास ही असली पूंजी है। जो विक्रेता पीईटी बोतलें, पीपी डिब्बे या मिश्रित स्क्रैप जमा करते हैं, उन्हें आज का रेट पता होना चाहिए — “बाद में बताएँगे” नहीं।

NAVRIT हर दिन खरीद रेट प्रकाशित करता है ताकि विक्रेताओं को अफवाहों या अंतिम समय की मोलभाव पर निर्भर न रहना पड़े। स्पष्ट रेट बोर्ड छोटे संग्रहकर्ताओं को यह तय करने में मदद करता है कि कब बेचना है, कैसे छांटना है, और किस सामग्री को प्राथमिकता देनी है।

पारदर्शिता दोनों पक्षों की रक्षा करती है। जब पीईटी फ्लेक्स या एचडीपीई ड्रम की कीमत दिखती है, विवाद कम होते हैं। खरीदार और विक्रेता एक ही आंकड़े देखते हैं। हफ्तों और महीनों में यही आदत एक ऐसी साख बनाती है जिसे कोई नारा नहीं खरीद सकता।`,
  },
  {
    slug: "from-scrap-to-resource",
    titleEn: "From scrap to resource: the circular path",
    titleHi: "स्क्रैप से संसाधन: चक्रीय रास्ता",
    excerptEn:
      "Collection, sorting, and refinement turn overlooked plastic into materials that re-enter the economy instead of landfills.",
    excerptHi:
      "संग्रह, छँटाई और परिष्करण नज़रअंदाज़ प्लास्टिक को लैंडफिल के बजाय अर्थव्यवस्था में वापस लाते हैं।",
    image: "/articles/circular.svg",
    publishedAt: "2026-07-02",
    bodyEn: `Plastic does not disappear when it is thrown away. It waits — in drains, dumps, and warehouses — until someone gives it a second life.

The circular path starts on the ground: collectors gather discarded bottles, films, and containers. Next comes sorting — PET, PP, HDPE, coloured, white, flexible. Clean separation raises value and reduces contamination in recycling lines.

Refinement then transforms scrap into usable feedstock: flakes, granules, or sorted bales ready for manufacturers. Every step that keeps material in the loop saves landfill space and reduces the need for virgin plastic.

NAVRIT sits at this junction. We buy with published rates, encourage better sorting, and treat waste as a resource — not a problem to hide. When communities sell clean, sorted plastic, everyone wins: sellers earn more, processors get better input, and the environment carries less burden.`,
    bodyHi: `फेंके जाने पर प्लास्टिक गायब नहीं होता। वह नालियों, ढेरों और गोदामों में इंतज़ार करता है — जब तक कोई उसे दूसरा जीवन न दे।

चक्रीय रास्ता ज़मीन से शुरू होता है: संग्रहकर्ता बोतलें, फिल्म और डिब्बे जमा करते हैं। फिर छँटाई — पीईटी, पीपी, एचडीपीई, रंगीन, सफेद, लचीला। साफ अलग करना मूल्य बढ़ाता है और रीसाइक्लिंग में प्रदूषण घटाता है।

परिष्करण स्क्रैप को उपयोगी कच्चे माल में बदलता है: फ्लेक्स, ग्रेन्यूल्स या छांटे हुए बेल। जो भी कदम सामग्री को चक्र में रखता है, वह लैंडफिल बचाता है और नए प्लास्टिक की जरूरत घटाता है।

NAVRIT इसी जोड़ पर खड़ा है। हम प्रकाशित रेट पर खरीदते हैं, बेहतर छँटाई को बढ़ावा देते हैं, और कचरे को छुपाने की समस्या नहीं — संसाधन मानते हैं।`,
  },
  {
    slug: "knowing-pet-pp-hdpe",
    titleEn: "PET, PP & HDPE — knowing your materials",
    titleHi: "PET, PP और HDPE — अपनी सामग्री जानें",
    excerptEn:
      "Different plastics carry different values. Understanding categories helps vendors get fairer rates for every kilo.",
    excerptHi:
      "अलग-अलग प्लास्टिक की अलग कीमत होती है। श्रेणियाँ समझने से बेहतर रेट मिलता है।",
    image: "/articles/materials.svg",
    publishedAt: "2026-06-28",
    bodyEn: `Not all plastic is equal at the buying yard. A clean PET bottle stream usually commands a different rate than mixed coloured scrap. PP dibba, HDPE drums, LD film, and black scrap each sit in their own band.

Knowing the basics helps you earn more:

• PET — water and soft-drink bottles; often higher demand when clean and sorted.
• PP — containers and industrial packaging; valued when free of heavy dirt.
• HDPE — drums and rigid bottles; useful when separated from mixed waste.
• Flexible / film — bags and LD film; rates vary with cleanliness and colour.

Mixing everything into one pile may feel faster, but it often lowers the average price. Five minutes of sorting at source can mean a better bill at the gate.

Use NAVRIT’s daily rate table as your guide. Compare categories, check yesterday’s movement on analytics (staff), and bring material that matches what the market wants today.`,
    bodyHi: `खरीद यार्ड में हर प्लास्टिक बराबर नहीं होता। साफ पीईटी बोतल का रेट मिश्रित रंगीन स्क्रैप से अलग होता है। पीपी डिब्बा, एचडीपीई ड्रम, एलडी फिल्म और काला स्क्रैप — सबकी अपनी पट्टी है।

बुनियादी बातें जानें तो कमाई बेहतर होती है:

• पीईटी — पानी/शीतल पेय की बोतलें; साफ और छांटी हुई होने पर मांग ज्यादा।
• पीपी — डिब्बे और पैकेजिंग; गंदगी कम हो तो मूल्य अच्छा।
• एचडीपीई — ड्रम और सख्त बोतलें; मिश्रित कचरे से अलग हों तो उपयोगी।
• लचीला/फिल्म — बैग और एलडी फिल्म; सफाई और रंग के अनुसार रेट बदलता है।

सब एक ढेर में मिलाने से काम तेज लग सकता है, पर औसत कीमत अक्सर गिर जाती है। स्रोत पर पाँच मिनट की छँटाई गेट पर बेहतर बिल दे सकती है।

NAVRIT के दैनिक रेट टेबल को गाइड बनाएँ। श्रेणियाँ तुलना करें और आज बाजार जो चाहता है, वही लेकर आएँ।`,
  },
];

function ensureArticlesTable() {
  sqlite.exec(`
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

  syncArticleImages();

  const count = (sqlite.prepare(`SELECT count(*) as c FROM articles`).get() as { c: number }).c;
  if (count > 0) return;

  const now = new Date().toISOString();
  const insert = sqlite.prepare(
    `INSERT INTO articles (slug, title_en, title_hi, excerpt_en, excerpt_hi, body_en, body_hi, image_url, published, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  );
  for (const a of SEED) {
    insert.run(
      a.slug,
      a.titleEn,
      a.titleHi,
      a.excerptEn,
      a.excerptHi,
      a.bodyEn,
      a.bodyHi,
      a.image,
      a.publishedAt,
      now,
      now
    );
  }
}

export function listPublishedArticles(limit = 50): Article[] {
  ensureArticlesTable();
  return sqlite
    .prepare(
      `SELECT * FROM articles WHERE published = 1 ORDER BY published_at DESC, id DESC LIMIT ?`
    )
    .all(limit) as Article[];
}

export function listAllArticles(): Article[] {
  ensureArticlesTable();
  return sqlite
    .prepare(`SELECT * FROM articles ORDER BY published_at DESC, id DESC`)
    .all() as Article[];
}

export function getArticleBySlug(slug: string, publishedOnly = true): Article | null {
  ensureArticlesTable();
  const row = publishedOnly
    ? (sqlite
        .prepare(`SELECT * FROM articles WHERE slug = ? AND published = 1`)
        .get(slug) as Article | undefined)
    : (sqlite.prepare(`SELECT * FROM articles WHERE slug = ?`).get(slug) as Article | undefined);
  return row ?? null;
}

export function getArticleById(id: number): Article | null {
  ensureArticlesTable();
  return (sqlite.prepare(`SELECT * FROM articles WHERE id = ?`).get(id) as Article | undefined) ?? null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function createArticle(data: {
  titleEn: string;
  titleHi: string;
  excerptEn: string;
  excerptHi: string;
  bodyEn: string;
  bodyHi: string;
  imageUrl?: string;
  published?: boolean;
  publishedAt?: string;
  slug?: string;
}) {
  ensureArticlesTable();
  const now = new Date().toISOString();
  let slug = data.slug || slugify(data.titleEn) || `article-${Date.now()}`;
  const exists = sqlite.prepare(`SELECT id FROM articles WHERE slug = ?`).get(slug);
  if (exists) slug = `${slug}-${Date.now()}`;

  const published = data.published ? 1 : 0;
  const publishedAt = published ? data.publishedAt || now.slice(0, 10) : null;

  const r = sqlite
    .prepare(
      `INSERT INTO articles (slug, title_en, title_hi, excerpt_en, excerpt_hi, body_en, body_hi, image_url, published, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      slug,
      data.titleEn,
      data.titleHi,
      data.excerptEn,
      data.excerptHi,
      data.bodyEn,
      data.bodyHi,
      data.imageUrl || null,
      published,
      publishedAt,
      now,
      now
    );
  return Number(r.lastInsertRowid);
}

export function updateArticle(
  id: number,
  data: Partial<{
    titleEn: string;
    titleHi: string;
    excerptEn: string;
    excerptHi: string;
    bodyEn: string;
    bodyHi: string;
    imageUrl: string | null;
    published: boolean;
    publishedAt: string | null;
    slug: string;
  }>
) {
  ensureArticlesTable();
  const current = getArticleById(id);
  if (!current) return false;

  const published =
    data.published === undefined ? current.published : data.published ? 1 : 0;
  let publishedAt = data.publishedAt === undefined ? current.published_at : data.publishedAt;
  if (published && !publishedAt) publishedAt = new Date().toISOString().slice(0, 10);

  sqlite
    .prepare(
      `UPDATE articles SET slug = ?, title_en = ?, title_hi = ?, excerpt_en = ?, excerpt_hi = ?,
       body_en = ?, body_hi = ?, image_url = ?, published = ?, published_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      data.slug ?? current.slug,
      data.titleEn ?? current.title_en,
      data.titleHi ?? current.title_hi,
      data.excerptEn ?? current.excerpt_en,
      data.excerptHi ?? current.excerpt_hi,
      data.bodyEn ?? current.body_en,
      data.bodyHi ?? current.body_hi,
      data.imageUrl === undefined ? current.image_url : data.imageUrl,
      published,
      publishedAt,
      new Date().toISOString(),
      id
    );
  return true;
}

export function deleteArticle(id: number) {
  ensureArticlesTable();
  sqlite.prepare(`DELETE FROM articles WHERE id = ?`).run(id);
}

/** Plain objects for RSC → client */
export function serializeArticles(rows: Article[]) {
  return JSON.parse(JSON.stringify(rows)) as Article[];
}
