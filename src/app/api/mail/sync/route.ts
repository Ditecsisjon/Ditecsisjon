// Hämtar riktiga mejl från IMAP-brevlådan (Websupport) och returnerar dem som
// Lead-objekt. Utan IMAP-uppgifter i miljön svarar routen { configured: false }
// och appen fortsätter i demoläge.

import { NextResponse } from "next/server";
import { readMailConfig, fetchLeadsFromImap } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = readMailConfig();
  if (!config) {
    return NextResponse.json({
      configured: false,
      message:
        "IMAP är inte konfigurerat. Sätt IMAP_USER och IMAP_PASSWORD i .env.local.",
    });
  }

  try {
    const { leads, threads } = await fetchLeadsFromImap(config);
    return NextResponse.json({
      configured: true,
      count: leads.length,
      leads,
      threads,
      mailbox: config.mailbox,
      account: config.user,
    });
  } catch (err) {
    return NextResponse.json(
      {
        configured: true,
        error:
          err instanceof Error ? err.message : "Kunde inte hämta mejl via IMAP.",
      },
      { status: 502 }
    );
  }
}
