"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { TodayRateRow } from "@/lib/rates";

type PdfInput = {
  title: string;
  date: string;
  business: string;
  locale: "en" | "hi";
  rows: TodayRateRow[];
  labels: { name: string; category: string; rate: string };
};

export function downloadRatesPdf(input: PdfInput) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(input.business, 14, 18);
  doc.setFontSize(12);
  doc.text(`${input.title} — ${input.date}`, 14, 28);

  autoTable(doc, {
    startY: 34,
    head: [[input.labels.name, input.labels.category, input.labels.rate]],
    body: input.rows.map((r) => [
      input.locale === "hi" ? r.nameHi : r.nameEn,
      input.locale === "hi" ? r.categoryHi : r.categoryEn,
      `₹${r.rate.toFixed(2)}`,
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [12, 47, 42] },
  });

  doc.save(`plastic-rates-${input.date}.pdf`);
}
