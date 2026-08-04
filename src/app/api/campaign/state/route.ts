// Delad kampanjstatus (för att inkommande SMS ska kunna matcha kunder).
// GET hämtar aktuell status, POST sparar den. Klienten speglar sin
// localStorage hit så att webhooken har tillgång till listan.

import { NextResponse } from "next/server";
import { readState, writeState, type CampaignState } from "@/lib/campaignStore.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readState());
}

export async function POST(request: Request) {
  let body: CampaignState;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.recipients)) {
    return NextResponse.json({ error: "recipients krävs" }, { status: 400 });
  }
  await writeState({ recipients: body.recipients, settings: body.settings });
  return NextResponse.json({ ok: true });
}
