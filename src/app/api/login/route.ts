import { NextResponse } from "next/server";
import { AUTH_COOKIE, sha256hex } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  const pw = process.env.APP_PASSWORD;

  // Ingen inloggning konfigurerad (lokalt) – släpp in
  if (!pw) return NextResponse.json({ ok: true });

  if (password !== pw) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = await sha256hex(pw);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dagar
  });
  return res;
}
