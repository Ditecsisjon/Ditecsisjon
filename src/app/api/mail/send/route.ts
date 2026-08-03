// Skickar ett svar via SMTP. Utan SMTP-/IMAP-uppgifter svarar routen
// { configured: false } och appen registrerar meddelandet lokalt istället.

import { NextResponse } from "next/server";
import { readSmtpConfig, sendMail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { to?: string; subject?: string; body?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const { to = "", subject = "", body = "" } = payload;
  if (!to.trim()) {
    return NextResponse.json({ error: "Mottagare (to) krävs" }, { status: 400 });
  }

  const config = readSmtpConfig();
  if (!config) {
    return NextResponse.json({
      configured: false,
      message: "SMTP är inte konfigurerat. Sätt SMTP_/IMAP-uppgifter i .env.local.",
    });
  }

  try {
    const result = await sendMail(config, { to, subject, text: body });
    return NextResponse.json({ configured: true, sent: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        configured: true,
        sent: false,
        error: err instanceof Error ? err.message : "Kunde inte skicka mejl.",
      },
      { status: 502 }
    );
  }
}
