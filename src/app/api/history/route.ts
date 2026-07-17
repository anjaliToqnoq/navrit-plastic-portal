import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getHistory } from "@/lib/rates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const materialId = Number(req.nextUrl.searchParams.get("materialId"));
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!materialId || !from || !to) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }
  return NextResponse.json({ history: getHistory(materialId, from, to) });
}
