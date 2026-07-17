/** Client-side monthly report import & multi-month comparison (no server storage). */

export type ReportRow = {
  date: string;
  materialEn: string;
  materialHi: string;
  categoryEn: string;
  categoryHi: string;
  rate: number;
  unit: string;
};

export type MonthReport = {
  id: string;
  label: string; // e.g. 2026-05
  fileName: string;
  rows: ReportRow[];
  loadedAt: string;
};

export type MonthSummary = {
  label: string;
  rowCount: number;
  dayCount: number;
  materialCount: number;
  avgRate: number;
  highRate: number;
  lowRate: number;
  highMaterial: string;
  lowMaterial: string;
};

export type MaterialCompare = {
  materialEn: string;
  categoryEn: string;
  months: Record<string, number | null>; // label -> avg rate that month
};

const COL = {
  date: ["date", "Date"],
  materialEn: ["material_en", "Material_EN", "material en", "name_en"],
  materialHi: ["material_hi", "Material_HI", "material hi", "name_hi"],
  categoryEn: ["category_en", "Category_EN", "category en"],
  categoryHi: ["category_hi", "Category_HI", "category hi"],
  rate: ["rate", "Rate"],
  unit: ["unit", "Unit"],
};

function normKey(k: string) {
  return k.trim().toLowerCase().replace(/\s+/g, "_");
}

function pick(obj: Record<string, unknown>, aliases: string[]) {
  const map = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) map.set(normKey(k), v);
  for (const a of aliases) {
    const v = map.get(normKey(a));
    if (v != null && String(v).trim() !== "") return v;
  }
  return "";
}

export function rowsFromSheetObjects(objects: Record<string, unknown>[]): ReportRow[] {
  const out: ReportRow[] = [];
  for (const obj of objects) {
    const date = String(pick(obj, COL.date) || "").slice(0, 10);
    const rate = Number(pick(obj, COL.rate));
    if (!date || Number.isNaN(rate)) continue;
    out.push({
      date,
      materialEn: String(pick(obj, COL.materialEn) || "Unknown"),
      materialHi: String(pick(obj, COL.materialHi) || ""),
      categoryEn: String(pick(obj, COL.categoryEn) || ""),
      categoryHi: String(pick(obj, COL.categoryHi) || ""),
      rate,
      unit: String(pick(obj, COL.unit) || "₹/kg"),
    });
  }
  return out;
}

export function detectMonthLabel(rows: ReportRow[], fileName: string): string {
  if (rows.length) {
    const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort();
    if (months.length === 1) return months[0];
    if (months.length > 1) return `${months[0]}…${months[months.length - 1]}`;
  }
  const m = fileName.match(/(20\d{2})[-_.]?(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  return fileName.replace(/\.(csv|xlsx)$/i, "").slice(0, 20) || "Report";
}

export function summarizeMonth(report: MonthReport): MonthSummary {
  const { rows, label } = report;
  if (!rows.length) {
    return {
      label,
      rowCount: 0,
      dayCount: 0,
      materialCount: 0,
      avgRate: 0,
      highRate: 0,
      lowRate: 0,
      highMaterial: "—",
      lowMaterial: "—",
    };
  }
  // Average per material first, then overall
  const byMat = new Map<string, number[]>();
  for (const r of rows) {
    const list = byMat.get(r.materialEn) || [];
    list.push(r.rate);
    byMat.set(r.materialEn, list);
  }
  const matAvgs = [...byMat.entries()].map(([name, rates]) => ({
    name,
    avg: rates.reduce((a, b) => a + b, 0) / rates.length,
  }));
  const overall = matAvgs.reduce((a, m) => a + m.avg, 0) / matAvgs.length;
  const high = matAvgs.reduce((a, m) => (m.avg > a.avg ? m : a), matAvgs[0]);
  const low = matAvgs.reduce((a, m) => (m.avg < a.avg ? m : a), matAvgs[0]);

  return {
    label,
    rowCount: rows.length,
    dayCount: new Set(rows.map((r) => r.date)).size,
    materialCount: byMat.size,
    avgRate: Math.round(overall * 100) / 100,
    highRate: Math.round(high.avg * 100) / 100,
    lowRate: Math.round(low.avg * 100) / 100,
    highMaterial: high.name,
    lowMaterial: low.name,
  };
}

export function compareMaterials(reports: MonthReport[]): MaterialCompare[] {
  const labels = reports.map((r) => r.label);
  const map = new Map<string, MaterialCompare>();

  for (const report of reports) {
    const byMat = new Map<string, { rates: number[]; category: string }>();
    for (const row of report.rows) {
      const cur = byMat.get(row.materialEn) || { rates: [], category: row.categoryEn };
      cur.rates.push(row.rate);
      cur.category = row.categoryEn || cur.category;
      byMat.set(row.materialEn, cur);
    }
    for (const [name, data] of byMat) {
      const avg = data.rates.reduce((a, b) => a + b, 0) / data.rates.length;
      const existing = map.get(name) || {
        materialEn: name,
        categoryEn: data.category,
        months: Object.fromEntries(labels.map((l) => [l, null as number | null])),
      };
      existing.months[report.label] = Math.round(avg * 100) / 100;
      existing.categoryEn = data.category || existing.categoryEn;
      map.set(name, existing);
    }
  }

  return [...map.values()].sort((a, b) => a.materialEn.localeCompare(b.materialEn));
}

export function monthAvgSeries(reports: MonthReport[]) {
  return reports.map((r) => {
    const s = summarizeMonth(r);
    return { label: s.label, avg: s.avgRate };
  });
}
