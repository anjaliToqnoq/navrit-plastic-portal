import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sqlite } from "@/db";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Railway production credentials are supplied through environment variables.
  // Keep the database-backed admin as a fallback for local/development setups.
  const envUsername = process.env.ADMIN_USERNAME;
  const envPassword = process.env.ADMIN_PASSWORD;

  if (envUsername && envPassword) {
    if (
      parsed.data.username !== envUsername ||
      parsed.data.password !== envPassword
    ) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession(envUsername);
    return NextResponse.json({ ok: true });
  }

  const admin = sqlite
    .prepare(`SELECT username, password_hash FROM admins WHERE username = ?`)
    .get(parsed.data.username) as { username: string; password_hash: string } | undefined;

  if (!admin || !(await bcrypt.compare(parsed.data.password, admin.password_hash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(admin.username);
  return NextResponse.json({ ok: true });
}
