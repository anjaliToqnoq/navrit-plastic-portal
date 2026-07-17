import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getSession } from "@/lib/auth";
import {
  createBackup,
  listBackups,
  resolveBackupPath,
  restoreBackup,
  verifyBackup,
  formatBytes,
} from "@/lib/backup";

export const dynamic = "force-dynamic";

async function guard() {
  return getSession();
}

export async function GET(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const download = req.nextUrl.searchParams.get("download");
  if (download) {
    try {
      const full = resolveBackupPath(download);
      const check = verifyBackup(download);
      if (!check.ok) {
        return NextResponse.json({ error: "Checksum failed" }, { status: 400 });
      }
      const buf = fs.readFileSync(full);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${download}"`,
          "X-Checksum-SHA256": check.actual,
        },
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Not found" },
        { status: 404 }
      );
    }
  }

  const backups = listBackups().map((b) => ({
    ...b,
    sizeLabel: formatBytes(b.size),
  }));
  return NextResponse.json({ backups });
}

export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body?.action === "restore") {
    try {
      const result = restoreBackup(String(body.filename || ""));
      return NextResponse.json({ ok: true, ...result });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Restore failed" },
        { status: 400 }
      );
    }
  }

  try {
    const reason = typeof body?.reason === "string" ? body.reason : "admin";
    const info = createBackup(reason);
    return NextResponse.json({
      ok: true,
      backup: { ...info, sizeLabel: formatBytes(info.size) },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Backup failed" },
      { status: 500 }
    );
  }
}
