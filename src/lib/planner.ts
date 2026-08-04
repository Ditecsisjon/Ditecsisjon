// Verkstadsplanerare med teknikerkompetens. Demo-schema tills en riktig
// källa (DOBS / verkstadsplaneraren) kopplas via /api/planner.
//
// Modell: arbetsdagar (mån–fre) delas i tre pass: 08–11, 11–14, 14–17.
// Varje tekniker har en uppsättning kompetenser. En tid är ledig om minst en
// tekniker med rätt kompetens är fri i det passet.

export interface Technician {
  id: string;
  name: string;
  competences: string[];
}

export const TECHNICIANS: Technician[] = [
  { id: "anders", name: "Anders", competences: ["rekond", "helrekond", "invandig", "polering", "stralkastare"] },
  { id: "bea", name: "Bea", competences: ["lackskydd", "polering", "rekond", "helrekond"] },
  { id: "ciro", name: "Ciro", competences: ["rostskydd", "rekond", "helrekond"] },
];

export const COMPETENCE_LABEL: Record<string, string> = {
  helrekond: "Helrekond",
  rekond: "Rekonditionering",
  lackskydd: "Lackskydd",
  rostskydd: "Rostskydd",
  invandig: "Invändig rengöring",
  polering: "Polering",
  stralkastare: "Strålkastarrenovering",
};

/** Vilken kompetens en tjänst kräver. */
export function serviceToCompetence(service?: string): string {
  const s = (service || "").toLowerCase();
  if (s.includes("rost")) return "rostskydd";
  if (s.includes("lackskydd") || s.includes("keramisk") || s.includes("lackförsegling"))
    return "lackskydd";
  if (s.includes("polering") || s.includes("polera")) return "polering";
  if (s.includes("strålkastare")) return "stralkastare";
  if (s.includes("invändig") || s.includes("rengöring") || s.includes("sanering"))
    return "invandig";
  if (s.includes("helrekond")) return "helrekond";
  return "rekond";
}

// Tre pass per dag
const SLOTS = [
  { index: 0, startH: 8, endH: 11, label: "08:00–11:00" },
  { index: 1, startH: 11, endH: 14, label: "11:00–14:00" },
  { index: 2, startH: 14, endH: 17, label: "14:00–17:00" },
];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministiskt "upptaget" i demoläge (~50 % beläggning). */
function isBusy(techId: string, d: Date, slotIndex: number): boolean {
  return hash(`${techId}|${dateKey(d)}|${slotIndex}`) % 100 < 50;
}

function isWorkday(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function competentTechs(competence: string): Technician[] {
  return TECHNICIANS.filter((t) => t.competences.includes(competence));
}

/** Vilket pass en tidpunkt hör till (0–2), eller null om utanför öppettid. */
function slotForHour(hour: number): number | null {
  if (hour < 11) return 0;
  if (hour < 14) return 1;
  if (hour < 17) return 2;
  return null;
}

export interface SlotResult {
  /** ISO för passets start */
  startISO: string;
  dateLabel: string; // t.ex. "tisdag 5 augusti"
  slotLabel: string; // t.ex. "11:00–14:00"
  technician: string;
}

function makeSlotStart(d: Date, slotIndex: number): Date {
  const s = new Date(d);
  s.setHours(SLOTS[slotIndex].startH, 0, 0, 0);
  return s;
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
}

/** Kollar om en önskad tid är ledig hos någon kompetent tekniker. */
export function checkRequested(
  requestedISO: string,
  competence: string
): { available: boolean; technician?: string; dateLabel: string; slotLabel: string } {
  const d = new Date(requestedISO);
  const slot = isWorkday(d) ? slotForHour(d.getHours()) : null;
  if (slot === null) {
    return { available: false, dateLabel: dateLabel(d), slotLabel: "utanför öppettid" };
  }
  const free = competentTechs(competence).find((t) => !isBusy(t.id, d, slot));
  return {
    available: !!free,
    technician: free?.name,
    dateLabel: dateLabel(d),
    slotLabel: SLOTS[slot].label,
  };
}

/** Föreslår de närmaste lediga passen (default 2) från en startpunkt. */
export function suggestSlots(fromISO: string, competence: string, count = 2): SlotResult[] {
  const techs = competentTechs(competence);
  const out: SlotResult[] = [];
  const cursor = new Date(fromISO);
  cursor.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 21 && out.length < count; dayOffset++) {
    const day = new Date(cursor);
    day.setDate(day.getDate() + dayOffset);
    if (!isWorkday(day)) continue;
    for (const slot of SLOTS) {
      if (out.length >= count) break;
      const start = makeSlotStart(day, slot.index);
      // hoppa över tider som redan passerat
      if (start.getTime() <= Date.now()) continue;
      const free = techs.find((t) => !isBusy(t.id, day, slot.index));
      if (free) {
        out.push({
          startISO: start.toISOString(),
          dateLabel: dateLabel(day),
          slotLabel: slot.label,
          technician: free.name,
        });
      }
    }
  }
  return out;
}

/** Enkel tolkning av önskad tid ur mejltext. Faller tillbaka på nästa vardag kl 10. */
export function parseRequestedTime(text: string, now: Date = new Date()): Date {
  const t = text.toLowerCase();
  const base = new Date(now);
  base.setSeconds(0, 0);

  // Utgångsdatum
  let target = new Date(base);
  target.setDate(target.getDate() + 1); // imorgon som standard

  if (t.includes("idag")) target = new Date(base);
  const weekdays = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
  for (let i = 0; i < weekdays.length; i++) {
    if (t.includes(weekdays[i])) {
      const d = new Date(base);
      let add = (i - d.getDay() + 7) % 7;
      if (add === 0) add = 7; // nästa förekomst
      d.setDate(d.getDate() + add);
      target = d;
      break;
    }
  }

  // Klockslag: "kl 14", "14:00", "kl. 9"
  let hour = 10;
  const hm = t.match(/kl\.?\s*(\d{1,2})(?:[:.](\d{2}))?/) || t.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (hm) {
    const h = parseInt(hm[1], 10);
    if (h >= 0 && h <= 23) hour = h;
  }
  target.setHours(hour, 0, 0, 0);

  // Hoppa till vardag om helg
  while (target.getDay() === 0 || target.getDay() === 6) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

/** Formatera en Date till värdet för <input type="datetime-local">. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatSlot(s: SlotResult): string {
  return `${s.dateLabel} kl ${s.slotLabel} (tekniker: ${s.technician})`;
}
