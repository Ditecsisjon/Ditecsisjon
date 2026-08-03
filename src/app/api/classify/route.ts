// AI-kategorisering av inkommande mejl.
//
// Om ANTHROPIC_API_KEY är satt används Claude för att bestämma kategori,
// prioritet, tjänst och en kort sammanfattning. Saknas nyckeln faller vi
// automatiskt tillbaka på den regelbaserade klassificeringen så att appen
// alltid fungerar.

import { NextResponse } from "next/server";
import { classifyByRules, type Classification } from "@/lib/classifier";
import type { Category, Priority } from "@/lib/types";

export const runtime = "nodejs";

interface ClassifyRequest {
  subject: string;
  body: string;
}

const SYSTEM_PROMPT = `Du är en assistent för städföretaget Ditec Sisjön. Du läser inkommande kundmejl och klassificerar dem.

Svara ENDAST med ett JSON-objekt med fälten:
- "category": en av "offert" (kunden vill ha pris/offert), "bokning" (kunden vill boka/beställa en tjänst), "konsultation" (kunden ställer frågor eller vill ha rådgivning), "ovrigt" (fakturor, jobbansökningar, leverantörer, spam m.m.)
- "priority": "hog", "medel" eller "lag" (hög om brådskande eller stort värde)
- "service": tjänsten det gäller om det framgår (t.ex. "Flyttstädning", "Hemstädning", "Kontorsstädning", "Fönsterputs", "Byggstädning", "Storstädning", "Trappstädning"), annars null
- "summary": en mening på svenska som sammanfattar ärendet
- "confidence": ett tal 0-1 för hur säker du är

Returnera bara JSON, ingen annan text.`;

async function classifyWithClaude(
  subject: string,
  body: string,
  apiKey: string
): Promise<Classification | null> {
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
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Ämne: ${subject}\n\nMeddelande:\n${body}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const validCategories: Category[] = ["offert", "bokning", "konsultation", "ovrigt"];
    const validPriorities: Priority[] = ["hog", "medel", "lag"];

    return {
      category: validCategories.includes(parsed.category) ? parsed.category : "ovrigt",
      priority: validPriorities.includes(parsed.priority) ? parsed.priority : "medel",
      service: parsed.service || undefined,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let payload: ClassifyRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const { subject = "", body = "" } = payload;
  if (!subject && !body) {
    return NextResponse.json({ error: "subject eller body krävs" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    const aiResult = await classifyWithClaude(subject, body, apiKey);
    if (aiResult) {
      return NextResponse.json({ ...aiResult, source: "ai" });
    }
  }

  // Fallback: regelbaserad kategorisering
  const rules = classifyByRules(subject, body);
  return NextResponse.json({ ...rules, source: "rules" });
}
