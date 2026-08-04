// Webhook för inkommande SMS (t.ex. från 46elks). Tolkar kundens svar,
// uppdaterar kampanjstatusen och skickar automatiskt rätt svar (pris,
// tillgänglighet, rabatt vid såld bil m.m.).
//
// Sätt denna URL som "SMS callback"/webhook hos din SMS-leverantör:
//   https://din-app-adress/api/sms/inbound
// Kräver att appen är nåbar från internet (hosting) och att kampanjlistan
// speglats till servern (sker automatiskt från kampanjvyn).

import { NextResponse } from "next/server";
import { readState, writeState, findByPhone } from "@/lib/campaignStore.server";
import { classifyReply, autoReply } from "@/lib/campaign";
import { sendSms } from "@/lib/sms.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseBody(request: Request): Promise<{ from: string; message: string }> {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = await request.json().catch(() => ({}));
    return { from: j.from || j.From || "", message: j.message || j.Body || j.text || "" };
  }
  // 46elks skickar form-encoded
  const text = await request.text();
  const params = new URLSearchParams(text);
  return {
    from: params.get("from") || params.get("From") || "",
    message: params.get("message") || params.get("Body") || "",
  };
}

export async function POST(request: Request) {
  const { from, message } = await parseBody(request);
  if (!from || !message) {
    return NextResponse.json({ error: "from och message krävs" }, { status: 400 });
  }

  const state = await readState();
  const recipient = findByPhone(state.recipients, from);
  const reply = classifyReply(message);

  if (recipient) {
    recipient.status = "svarat";
    recipient.reply = reply;
    recipient.replyAt = new Date().toISOString();
    const answer = autoReply(recipient, state.settings);
    const result = await sendSms(from, answer);
    if (result.sent) recipient.autoReplySent = true;
    await writeState(state);
    return NextResponse.json({ ok: true, matched: true, reply, autoReplySent: result.sent });
  }

  // Okänt nummer – logga inget, svara ok så leverantören inte gör om
  return NextResponse.json({ ok: true, matched: false, reply });
}
