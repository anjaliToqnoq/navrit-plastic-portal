import { NextRequest, NextResponse } from "next/server";
import { format, startOfMonth, startOfWeek, subDays } from "date-fns";
import { getSession } from "@/lib/auth";
import { getRatesForRange, todayStr } from "@/lib/rates";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") || "daily";
  const formatType = req.nextUrl.searchParams.get("format") || "csv";
  const today = todayStr();
  const monthParam = req.nextUrl.searchParams.get("month"); // YYYY-MM

  let from = today;
  let to = today;
  if (type === "weekly") {
    from = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  } else if (type === "monthly") {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      from = `${monthParam}-01`;
      const [y, m] = monthParam.split("-").map(Number);
      const last = new Date(y, m, 0);
      to = format(last, "yyyy-MM-dd");
    } else {
      from = format(startOfMonth(new Date()), "yyyy-MM-dd");
    }
  } else if (type === "custom") {
    from = req.nextUrl.searchParams.get("from") || format(subDays(new Date(), 7), "yyyy-MM-dd");
    to = req.nextUrl.searchParams.get("to") || today;
  }

  const rows = getRatesForRange(from, to);
  const monthTag = type === "monthly" ? from.slice(0, 7) : from;
  const flat = rows.map((r) => ({
    Date: r.date,
    Month: r.date.slice(0, 7),
    Material_EN: r.nameEn,
    Material_HI: r.nameHi,
    Category_EN: r.categoryEn,
    Category_HI: r.categoryHi,
    Rate: r.rate,
    Unit: r.unit,
  }));

  if (formatType === "xlsx" || formatType === "excel") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(flat);
    XLSX.utils.book_append_sheet(wb, ws, "Rates");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rates-${type}-${monthTag}.xlsx"`,
      },
    });
  }

  const header = Object.keys(flat[0] || { Date: "", Material_EN: "", Rate: "" }).join(",");
  const csv = [
    header,
    ...flat.map((row) =>
      Object.values(row)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rates-${type}-${monthTag}.csv"`,
    },
  });
}
