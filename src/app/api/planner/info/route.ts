// Hämtar verkstadsinformation: tekniker, kompetenser och veckoschema.
// Demoläge använder inbyggd planerare. Skarpt läge: sätt PLANNER_INFO_URL
// (+ ev. PLANNER_API_KEY) så hämtas det från verkstadsplaneraren.

import { NextResponse } from "next/server";
import { TECHNICIANS, getWeekSchedule, COMPETENCE_LABEL } from "@/lib/planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const url = process.env.PLANNER_INFO_URL;
  const key = process.env.PLANNER_API_KEY;
  if (url) {
    try {
      const res = await fetch(url, {
        headers: key ? { Authorization: `Bearer ${key}`, "x-api-key": key } : {},
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ source: "planner", ...data });
      }
    } catch {
      // faller tillbaka på demo
    }
  }
  return NextResponse.json({
    source: "demo",
    technicians: TECHNICIANS,
    competenceLabels: COMPETENCE_LABEL,
    week: getWeekSchedule(new Date().toISOString()),
  });
}
