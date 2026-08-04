// Genererar ett dynamiskt svarsförslag med Claude utifrån kundens exakta mejl.
// Utan ANTHROPIC_API_KEY svarar routen { configured: false } och appen använder
// den vanliga mallen istället.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Body {
  subject?: string;
  body?: string;
  from?: string;
  service?: string;
  category?: string;
  regnr?: string;
  vehicle?: {
    brand?: string;
    model?: string;
    modelYear?: number;
    color?: string;
  } | null;
  template?: string;
}

const SYSTEM_PROMPT = `Du är kundtjänst för bilvårdsföretaget Ditec Sisjön (rekonditionering, lackskydd, rostskydd m.m.).
Skriv ett vänligt, professionellt och konkret svar på svenska på kundens mejl.

Riktlinjer:
- Svara direkt på det kunden faktiskt frågar om.
- Om en mall ges: följ dess ton och struktur, men anpassa innehållet till kundens mejl.
- Nämn bilen naturligt om fordonsuppgifter finns.
- Föreslå tydligt nästa steg (boka tid, komma förbi, eller återkomma med offert).
- Hitta inte på exakta priser om de inte angetts.
- Avsluta med "Vänliga hälsningar, Ditec Sisjön".
- Svara ENDAST med själva mejltexten, inget annat.`;

export async function POST(request: Request) {
  let payload: Body;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ configured: false });
  }

  const v = payload.vehicle;
  const vehicleLine = v
    ? `Bil: ${[v.brand, v.model, v.modelYear, v.color].filter(Boolean).join(" ")}${
        payload.regnr ? ` (${payload.regnr})` : ""
      }`
    : payload.regnr
    ? `Regnr: ${payload.regnr}`
    : "";

  const userContent = [
    `Kundens mejl:`,
    `Ämne: ${payload.subject ?? ""}`,
    payload.body ?? "",
    "",
    `Kund: ${payload.from ?? ""}`,
    payload.service ? `Tjänst: ${payload.service}` : "",
    vehicleLine,
    payload.template ? `\nMall att utgå från (ton/stil):\n${payload.template}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `AI svarade med fel (${res.status})` },
        { status: 502 }
      );
    }
    const data = await res.json();
    const text: string = data?.content?.[0]?.text?.trim() ?? "";
    if (!text) return NextResponse.json({ error: "Tomt AI-svar" }, { status: 502 });
    return NextResponse.json({ text, source: "ai" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunde inte nå AI." },
      { status: 502 }
    );
  }
}
