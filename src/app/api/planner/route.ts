// Kollar tillgänglighet i verkstadsplaneraren med hänsyn till teknikerkompetens.
//
// Demoläge: använder inbyggd planerare (src/lib/planner.ts).
// Skarpt läge: sätt PLANNER_API_URL (+ ev. PLANNER_API_KEY) i .env.local så
// hämtas schemat från DOBS / verkstadsplaneraren. Svaret mappas till samma
// format – justera mappningen nedan efter din leverantör.

import { NextResponse } from "next/server";
import {
  serviceToCompetence,
  checkRequested,
  suggestSlots,
  COMPETENCE_LABEL,
} from "@/lib/planner";
import { readTechnicians } from "@/lib/plannerStore.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  let payload: { requestedISO?: string; service?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const requestedISO = payload.requestedISO;
  if (!requestedISO) {
    return NextResponse.json({ error: "requestedISO krävs" }, { status: 400 });
  }
  const competence = serviceToCompetence(payload.service);

  // Skarpt läge – hämta från extern planerare om konfigurerat
  const apiUrl = process.env.PLANNER_API_URL;
  const apiKey = process.env.PLANNER_API_KEY;
  if (apiUrl) {
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({ requestedISO, competence, service: payload.service }),
      });
      if (res.ok) {
        const data = await res.json();
        // Förväntat format: { requested: {available, technician, dateLabel, slotLabel}, suggestions: [...] }
        return NextResponse.json({ source: "planner", competence, ...data });
      }
      // annars faller vi tillbaka på demo nedan
    } catch {
      // nätverksfel -> demo nedan
    }
  }

  // Demoläge (med era sparade tekniker)
  const techs = await readTechnicians();
  const requested = checkRequested(requestedISO, competence, techs);
  const suggestions = requested.available
    ? []
    : suggestSlots(requestedISO, competence, 2, techs);

  return NextResponse.json({
    source: "demo",
    competence,
    competenceLabel: COMPETENCE_LABEL[competence] ?? competence,
    requested,
    suggestions,
  });
}
