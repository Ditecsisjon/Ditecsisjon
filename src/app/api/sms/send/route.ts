// Skickar SMS. Demoläge (utan konfiguration) markerar bara som skickat.
// Skarpt läge: sätt SMS_API_USERNAME + SMS_API_PASSWORD (46elks) och SMS_FROM
// i .env.local. Går även att byta till annan leverantör – anpassa fetch nedan.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { to?: string; message?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const { to = "", message = "" } = payload;
  if (!to.trim() || !message.trim()) {
    return NextResponse.json({ error: "to och message krävs" }, { status: 400 });
  }

  const user = process.env.SMS_API_USERNAME;
  const pass = process.env.SMS_API_PASSWORD;
  const from = process.env.SMS_FROM || "Ditec";

  if (!user || !pass) {
    return NextResponse.json({ configured: false });
  }

  try {
    // 46elks (svensk SMS-tjänst)
    const body = new URLSearchParams({ from, to, message });
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const res = await fetch("https://api.46elks.com/a1/sms", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { configured: true, sent: false, error: `SMS-fel (${res.status}): ${text}` },
        { status: 502 }
      );
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ configured: true, sent: true, id: data?.id });
  } catch (err) {
    return NextResponse.json(
      { configured: true, sent: false, error: err instanceof Error ? err.message : "Kunde inte skicka SMS." },
      { status: 502 }
    );
  }
}
