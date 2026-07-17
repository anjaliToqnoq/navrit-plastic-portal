import { sqlite } from "@/db";

/** Keep article cover paths on local assets that always load. */
export function syncArticleImages() {
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

  const map: Record<string, string> = {
    "transparent-daily-rates-build-trust": "/articles/rates.svg",
    "from-scrap-to-resource": "/articles/circular.svg",
    "knowing-pet-pp-hdpe": "/articles/materials.svg",
  };

  const upd = sqlite.prepare(`UPDATE articles SET image_url = ? WHERE slug = ?`);
  for (const [slug, url] of Object.entries(map)) {
    upd.run(url, slug);
  }

  // Fix any remaining external broken URLs
  sqlite
    .prepare(
      `UPDATE articles SET image_url = '/articles/rates.svg'
       WHERE image_url IS NULL OR image_url LIKE '%unsplash%' OR image_url = ''`
    )
    .run();
}
