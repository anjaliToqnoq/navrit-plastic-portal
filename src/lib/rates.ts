import { format, startOfMonth, subDays, subMonths } from "date-fns";
import { sqlite, type Category, type Material } from "@/db";

/** Business day in India (IST) — Railway servers are often US time. */
export function todayStr(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function nowIso() {
  return new Date().toISOString();
}

export type TodayRateRow = {
  materialId: number;
  nameEn: string;
  nameHi: string;
  categoryId: number;
  categoryEn: string;
  categoryHi: string;
  rate: number;
  unit: string;
  updatedAt: string;
  sortOrder: number;
};

export function getTodayRates(date = todayStr()): TodayRateRow[] {
  const rows = sqlite
    .prepare(
      `SELECT m.id as materialId, m.name_en as nameEn, m.name_hi as nameHi,
              c.id as categoryId, c.name_en as categoryEn, c.name_hi as categoryHi,
              r.rate as rate, m.unit as unit, r.updated_at as updatedAt, m.sort_order as sortOrder
       FROM rate_snapshots r
       JOIN materials m ON m.id = r.material_id
       JOIN categories c ON c.id = m.category_id
       WHERE r.rate_date = ? AND r.published = 1 AND m.active = 1 AND c.active = 1
       ORDER BY c.sort_order ASC, m.sort_order ASC`
    )
    .all(date) as TodayRateRow[];
  return JSON.parse(JSON.stringify(rows)) as TodayRateRow[];
}

export function getLatestPublishedDate(): string | null {
  const row = sqlite
    .prepare(
      `SELECT rate_date as d FROM rate_snapshots WHERE published = 1 ORDER BY rate_date DESC LIMIT 1`
    )
    .get() as { d: string } | undefined;
  return row?.d ?? null;
}

export function getPublicRates() {
  const today = todayStr();
  const todayRows = getTodayRates(today);
  if (todayRows.length > 0) {
    return { date: today, rows: todayRows, ratesAsOf: today };
  }
  // No rates for IST today yet — show latest board, but badge stays on calendar today
  const latest = getLatestPublishedDate();
  if (latest) {
    return { date: today, rows: getTodayRates(latest), ratesAsOf: latest };
  }
  return { date: today, rows: [], ratesAsOf: today };
}

export function getStats(rows: TodayRateRow[]) {
  const rates = rows.map((r) => r.rate);
  const categoriesSet = new Set(rows.map((r) => r.categoryId));
  const lastUpdated = rows.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), "");
  return {
    totalCategories: categoriesSet.size,
    lastUpdated: lastUpdated || null,
    highest: rates.length ? Math.max(...rates) : null,
    lowest: rates.length ? Math.min(...rates) : null,
  };
}

export function listCategories(includeInactive = false): Category[] {
  if (includeInactive) {
    return sqlite
      .prepare(`SELECT * FROM categories ORDER BY sort_order ASC`)
      .all() as Category[];
  }
  return sqlite
    .prepare(`SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC`)
    .all() as Category[];
}

export type MaterialWithCategory = Material & {
  category_en: string;
  category_hi: string;
};

export function listMaterials(includeInactive = false): MaterialWithCategory[] {
  const sql = includeInactive
    ? `SELECT m.*, c.name_en as category_en, c.name_hi as category_hi
       FROM materials m JOIN categories c ON c.id = m.category_id
       ORDER BY c.sort_order ASC, m.sort_order ASC`
    : `SELECT m.*, c.name_en as category_en, c.name_hi as category_hi
       FROM materials m JOIN categories c ON c.id = m.category_id
       WHERE m.active = 1
       ORDER BY c.sort_order ASC, m.sort_order ASC`;
  return sqlite.prepare(sql).all() as MaterialWithCategory[];
}

export function getHistory(materialId: number, from: string, to: string) {
  const rows = sqlite
    .prepare(
      `SELECT rate_date as date, rate FROM rate_snapshots
       WHERE material_id = ? AND published = 1 AND rate_date >= ? AND rate_date <= ?
       ORDER BY rate_date ASC`
    )
    .all(materialId, from, to) as Array<{ date: string; rate: number }>;
  return JSON.parse(JSON.stringify(rows)) as Array<{ date: string; rate: number }>;
}

export function getAnalyticsSummary() {
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const prevMonthStart = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
  const prevMonthEnd = format(subDays(startOfMonth(new Date()), 1), "yyyy-MM-dd");
  const today = todayStr();
  const mats = listMaterials(false);

  const perMaterial = mats.map((m) => {
    const current = sqlite
      .prepare(
        `SELECT avg(rate) as avg, max(rate) as max, min(rate) as min
         FROM rate_snapshots
         WHERE material_id = ? AND published = 1 AND rate_date >= ? AND rate_date <= ?`
      )
      .get(m.id, monthStart, today) as { avg: number | null; max: number | null; min: number | null };

    const previous = sqlite
      .prepare(
        `SELECT avg(rate) as avg FROM rate_snapshots
         WHERE material_id = ? AND published = 1 AND rate_date >= ? AND rate_date <= ?`
      )
      .get(m.id, prevMonthStart, prevMonthEnd) as { avg: number | null };

    const avg = current?.avg ?? 0;
    const prevAvg = previous?.avg ?? 0;
    const changePct = prevAvg ? ((avg - prevAvg) / prevAvg) * 100 : 0;

    return {
      materialId: m.id,
      nameEn: m.name_en,
      nameHi: m.name_hi,
      categoryEn: m.category_en,
      avg: avg ? Math.round(avg * 100) / 100 : 0,
      max: current?.max ?? 0,
      min: current?.min ?? 0,
      changePct: Math.round(changePct * 100) / 100,
      history: getHistory(m.id, monthStart, today),
    };
  });

  const best = [...perMaterial].sort((a, b) => b.changePct - a.changePct)[0] ?? null;
  const mins = perMaterial.map((p) => p.min).filter((n) => n > 0);

  return JSON.parse(
    JSON.stringify({
      monthStart,
      today,
      perMaterial,
      best,
      monthHigh: perMaterial.length ? Math.max(...perMaterial.map((p) => p.max)) : 0,
      monthLow: mins.length ? Math.min(...mins) : 0,
    })
  );
}

export function upsertTodayRate(materialId: number, rate: number, date = todayStr()) {
  const existing = sqlite
    .prepare(`SELECT id FROM rate_snapshots WHERE material_id = ? AND rate_date = ?`)
    .get(materialId, date) as { id: number } | undefined;

  if (existing) {
    sqlite
      .prepare(
        `UPDATE rate_snapshots SET rate = ?, published = 1, updated_at = ? WHERE id = ?`
      )
      .run(rate, nowIso(), existing.id);
    return existing.id;
  }

  const result = sqlite
    .prepare(
      `INSERT INTO rate_snapshots (material_id, rate_date, rate, published, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`
    )
    .run(materialId, date, rate, nowIso(), nowIso());
  return Number(result.lastInsertRowid);
}

export function duplicateYesterdayRates(targetDate = todayStr()) {
  const yesterday = format(subDays(new Date(targetDate + "T12:00:00"), 1), "yyyy-MM-dd");
  const rows = sqlite
    .prepare(
      `SELECT material_id, rate FROM rate_snapshots WHERE rate_date = ? AND published = 1`
    )
    .all(yesterday) as Array<{ material_id: number; rate: number }>;

  let count = 0;
  for (const r of rows) {
    upsertTodayRate(r.material_id, r.rate, targetDate);
    count++;
  }
  return count;
}

export function adminDashboardCounts() {
  const date = todayStr();
  const yesterday = format(subDays(new Date(date + "T12:00:00"), 1), "yyyy-MM-dd");
  const todaysEntries =
    (sqlite.prepare(`SELECT count(*) as c FROM rate_snapshots WHERE rate_date = ?`).get(date) as { c: number })
      .c;
  const categoryCount = (
    sqlite.prepare(`SELECT count(*) as c FROM categories WHERE active = 1`).get() as { c: number }
  ).c;
  const materialCount = (
    sqlite.prepare(`SELECT count(*) as c FROM materials WHERE active = 1`).get() as { c: number }
  ).c;
  const historical = (
    sqlite.prepare(`SELECT count(DISTINCT rate_date) as c FROM rate_snapshots`).get() as { c: number }
  ).c;
  const last = sqlite
    .prepare(`SELECT updated_at as u FROM rate_snapshots ORDER BY updated_at DESC LIMIT 1`)
    .get() as { u: string } | undefined;
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthlyAvg =
    (
      sqlite
        .prepare(
          `SELECT avg(rate) as avg FROM rate_snapshots WHERE rate_date >= ? AND published = 1`
        )
        .get(monthStart) as { avg: number | null }
    ).avg ?? 0;

  const todayAvg =
    (
      sqlite
        .prepare(`SELECT avg(rate) as avg FROM rate_snapshots WHERE rate_date = ?`)
        .get(date) as { avg: number | null }
    ).avg ?? 0;

  const high = sqlite
    .prepare(
      `SELECT m.name_en as name, r.rate as rate
       FROM rate_snapshots r JOIN materials m ON m.id = r.material_id
       WHERE r.rate_date = ? ORDER BY r.rate DESC LIMIT 1`
    )
    .get(date) as { name: string; rate: number } | undefined;

  const low = sqlite
    .prepare(
      `SELECT m.name_en as name, r.rate as rate
       FROM rate_snapshots r JOIN materials m ON m.id = r.material_id
       WHERE r.rate_date = ? ORDER BY r.rate ASC LIMIT 1`
    )
    .get(date) as { name: string; rate: number } | undefined;

  const changed = sqlite
    .prepare(
      `SELECT count(*) as c FROM rate_snapshots t
       JOIN rate_snapshots y ON y.material_id = t.material_id AND y.rate_date = ?
       WHERE t.rate_date = ? AND abs(t.rate - y.rate) > 0.0001`
    )
    .get(yesterday, date) as { c: number };

  const spark = sqlite
    .prepare(
      `SELECT rate_date as d, avg(rate) as avg
       FROM rate_snapshots WHERE rate_date >= ? AND published = 1
       GROUP BY rate_date ORDER BY rate_date ASC LIMIT 14`
    )
    .all(format(subDays(new Date(), 13), "yyyy-MM-dd")) as Array<{ d: string; avg: number }>;

  const recent = sqlite
    .prepare(
      `SELECT m.name_en as name, r.rate as rate, r.updated_at as updatedAt
       FROM rate_snapshots r JOIN materials m ON m.id = r.material_id
       ORDER BY r.updated_at DESC LIMIT 6`
    )
    .all() as Array<{ name: string; rate: number; updatedAt: string }>;

  return JSON.parse(
    JSON.stringify({
      todaysEntries,
      categoryCount,
      materialCount,
      historical,
      lastUpdate: last?.u ?? null,
      monthlyAvg: Math.round(monthlyAvg * 100) / 100,
      todayAvg: Math.round(todayAvg * 100) / 100,
      highest: high ? { name: high.name, rate: high.rate } : null,
      lowest: low ? { name: low.name, rate: low.rate } : null,
      pendingChanges: changed?.c ?? 0,
      sparkline: spark.map((s) => Math.round(s.avg * 100) / 100),
      recent,
    })
  );
}

export function getRatesForRange(from: string, to: string) {
  return sqlite
    .prepare(
      `SELECT r.rate_date as date, m.name_en as nameEn, m.name_hi as nameHi,
              c.name_en as categoryEn, c.name_hi as categoryHi, r.rate as rate, m.unit as unit
       FROM rate_snapshots r
       JOIN materials m ON m.id = r.material_id
       JOIN categories c ON c.id = m.category_id
       WHERE r.published = 1 AND r.rate_date >= ? AND r.rate_date <= ?
       ORDER BY r.rate_date DESC, c.sort_order, m.sort_order`
    )
    .all(from, to) as Array<{
    date: string;
    nameEn: string;
    nameHi: string;
    categoryEn: string;
    categoryHi: string;
    rate: number;
    unit: string;
  }>;
}
