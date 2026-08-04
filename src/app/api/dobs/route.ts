// Hämtar månadslistan med kunder för återbehandling.
// Demoläge: inbyggd exempellista. Skarpt läge: sätt DOBS_API_URL
// (+ ev. DOBS_API_KEY) så hämtas listan från DOBS. Mappa svaret till
// Recipient-formatet (se src/lib/campaign.ts) – justera vid behov.

import { NextResponse } from "next/server";
import { sampleDobsList } from "@/lib/campaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const url = process.env.DOBS_API_URL;
  const key = process.env.DOBS_API_KEY;
  if (url) {
    try {
      const res = await fetch(url, {
        headers: key ? { Authorization: `Bearer ${key}`, "x-api-key": key } : {},
      });
      if (res.ok) {
        const data = await res.json();
        // Förväntat: { recipients: Recipient[] } eller en array
        const recipients = Array.isArray(data) ? data : data.recipients ?? [];
        return NextResponse.json({ source: "dobs", recipients });
      }
    } catch {
      // faller tillbaka på demo
    }
  }
  return NextResponse.json({ source: "demo", recipients: sampleDobsList() });
}
