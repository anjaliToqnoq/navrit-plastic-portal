import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PurchaseSlipData = {
  docTitle: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  mode: "PET" | "PLASTIC";
  purchaseId: number;
  purchaseDate: string;
  vendorName: string;
  vendorPhone: string;
  vendorLocation: string;
  materialName: string;
  materialVariant: string;
  quantityKg: number;
  ratePerKg: number;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  paidBy: string;
  notes: string;
  /** Vendor running balances for this mode */
  vendorOutstanding: number;
  vendorAdvance: number;
  vendorTotalPurchase: number;
  vendorTotalPaid: number;
  /** Optional payment event overlay */
  payment?: {
    amount: number;
    paymentDate: string;
    paymentMode: string;
    paidBy: string;
    notes: string;
  };
  generatedAt: string;
};

function money(n: number) {
  return `INR ${Number(n || 0).toFixed(2)}`;
}

function kg(n: number) {
  return `${Number(n || 0).toFixed(3)} kg`;
}

export async function buildPurchaseSlipPdf(data: PurchaseSlipData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.05, 0.35, 0.22);
  const muted = rgb(0.35, 0.4, 0.38);
  const black = rgb(0.1, 0.12, 0.11);
  let y = 800;

  const draw = (text: string, opts?: { size?: number; font?: typeof font; color?: typeof black; x?: number }) => {
    page.drawText(text, {
      x: opts?.x ?? 40,
      y,
      size: opts?.size ?? 11,
      font: opts?.font ?? font,
      color: opts?.color ?? black,
    });
  };

  draw(data.businessName || "NAVRIT", { size: 18, font: bold, color: green });
  y -= 18;
  draw(data.businessAddress || "", { size: 9, color: muted });
  y -= 12;
  draw(`Phone / WhatsApp: ${data.businessPhone || "—"}`, { size: 9, color: muted });
  y -= 22;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1.2, color: green });
  y -= 28;

  draw(data.docTitle, { size: 14, font: bold });
  y -= 16;
  draw(`${data.mode} · Purchase #${data.purchaseId} · ${data.purchaseDate}`, { size: 10, color: muted });
  y -= 24;

  const leftRows: Array<[string, string]> = [
    ["Vendor", data.vendorName || "—"],
    ["WhatsApp", data.vendorPhone || "—"],
    ["Location", data.vendorLocation || "—"],
    ["Material", data.materialName || "—"],
    ["Type / variant", data.materialVariant || "—"],
    ["Quantity", kg(data.quantityKg)],
    ["Rate / kg", money(data.ratePerKg)],
  ];
  for (const [label, value] of leftRows) {
    draw(label, { size: 9, color: muted, font: bold });
    draw(String(value).slice(0, 70), { x: 160, size: 10 });
    y -= 16;
  }

  y -= 8;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.6, color: muted });
  y -= 20;

  draw("This purchase", { size: 12, font: bold, color: green });
  y -= 18;
  const moneyRows: Array<[string, string]> = [
    ["Gross / vendor total", money(data.totalAmount)],
    ["Paid on this purchase", money(data.paidAmount)],
    ["Remaining on this purchase", money(data.creditAmount)],
    ["Payment done by", data.paidBy || "—"],
  ];
  for (const [label, value] of moneyRows) {
    draw(label, { size: 9, color: muted, font: bold });
    draw(value, { x: 220, size: 11, font: bold });
    y -= 16;
  }

  if (data.payment) {
    y -= 8;
    draw("This payment", { size: 12, font: bold, color: green });
    y -= 18;
    for (const [label, value] of [
      ["Amount paid now", money(data.payment.amount)],
      ["Payment date", data.payment.paymentDate],
      ["Mode", data.payment.paymentMode || "Cash"],
      ["Paid by", data.payment.paidBy || "—"],
      ["Notes", data.payment.notes || "—"],
    ] as Array<[string, string]>) {
      draw(label, { size: 9, color: muted, font: bold });
      draw(String(value).slice(0, 70), { x: 220, size: 10 });
      y -= 16;
    }
  }

  y -= 8;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.6, color: muted });
  y -= 20;

  draw(`Vendor running balance (${data.mode})`, { size: 12, font: bold, color: green });
  y -= 18;
  for (const [label, value] of [
    ["Total purchases", money(data.vendorTotalPurchase)],
    ["Total paid", money(data.vendorTotalPaid)],
    ["Outstanding credit (remaining)", money(data.vendorOutstanding)],
    ["Advance balance", money(data.vendorAdvance)],
  ] as Array<[string, string]>) {
    draw(label, { size: 9, color: muted, font: bold });
    draw(value, { x: 260, size: 11, font: bold });
    y -= 16;
  }

  if (data.notes?.trim()) {
    y -= 10;
    draw("Notes", { size: 9, color: muted, font: bold });
    y -= 14;
    const note = data.notes.trim().slice(0, 220);
    draw(note, { size: 10 });
    y -= 16;
  }

  y = Math.min(y, 80);
  draw(`Generated ${data.generatedAt}`, { size: 8, color: muted });
  y -= 12;
  draw("GST not included. Auto-sent from NAVRIT portal via WhatsApp Business.", { size: 8, color: muted });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
