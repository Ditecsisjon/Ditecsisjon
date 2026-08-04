// Läser/sparar era tekniker + kompetenser.

import { NextResponse } from "next/server";
import { readTechnicians, writeTechnicians } from "@/lib/plannerStore.server";
import { COMPETENCE_LABEL, type Technician } from "@/lib/planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    technicians: await readTechnicians(),
    competenceLabels: COMPETENCE_LABEL,
  });
}

export async function POST(request: Request) {
  let body: { technicians?: Technician[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.technicians)) {
    return NextResponse.json({ error: "technicians krävs" }, { status: 400 });
  }
  await writeTechnicians(body.technicians);
  return NextResponse.json({ ok: true });
}
