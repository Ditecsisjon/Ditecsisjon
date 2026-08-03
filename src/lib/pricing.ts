// Priskonfigurator med storlekslogik. Bilens storleksklass härleds från
// fordonslängden (från fordonsuppslaget) och styr priset per behandling.
// Justera priserna här så uppdateras hela appen.

import type { Lead } from "./types";

export type CarSize = "liten" | "mellan" | "stor" | "xl";

export const SIZE_ORDER: CarSize[] = ["liten", "mellan", "stor", "xl"];

export const SIZE_LABEL: Record<CarSize, string> = {
  liten: "Liten bil",
  mellan: "Mellanstor bil",
  stor: "Stor bil / SUV",
  xl: "Extra stor / Transportbil",
};

/** Exempel på bilar per storlek (visas som hjälptext). */
export const SIZE_EXAMPLE: Record<CarSize, string> = {
  liten: "t.ex. VW Polo, Toyota Yaris",
  mellan: "t.ex. VW Golf, Volvo V40",
  stor: "t.ex. Volvo XC60/V90, Audi A6",
  xl: "t.ex. Volvo XC90, Merc. Sprinter",
};

/** Härleder storleksklass från bilens längd (mm). */
export function sizeFromLengthMm(mm?: number): CarSize {
  if (mm == null) return "mellan";
  if (mm < 4300) return "liten";
  if (mm < 4750) return "mellan";
  if (mm < 5050) return "stor";
  return "xl";
}

export interface Treatment {
  key: string;
  name: string;
  description: string;
  /** Pris i SEK per storlek */
  prices: Record<CarSize, number>;
  /** Nyckelord som gör att behandlingen föreslås automatiskt */
  matches: string[];
}

export const TREATMENTS: Treatment[] = [
  {
    key: "helrekond",
    name: "Helrekond (in- och utvändigt)",
    description: "Komplett rekonditionering, in- och utvändigt.",
    prices: { liten: 2500, mellan: 3200, stor: 3900, xl: 4600 },
    matches: ["helrekond", "rekond", "rekonditioner", "genomgång"],
  },
  {
    key: "utvandig",
    name: "Utvändig rekond",
    description: "Tvätt, avfettning, lackrengöring och vax utvändigt.",
    prices: { liten: 1500, mellan: 1900, stor: 2300, xl: 2700 },
    matches: ["utvändig", "tvätt", "vax"],
  },
  {
    key: "invandig",
    name: "Invändig rengöring",
    description: "Dammsugning, textil-/skinnrengöring, fläckborttagning.",
    prices: { liten: 1200, mellan: 1500, stor: 1800, xl: 2100 },
    matches: ["invändig", "rengöring", "sanering", "säten", "klädsel", "fläck"],
  },
  {
    key: "lackskydd",
    name: "Keramiskt lackskydd",
    description: "Långvarigt keramiskt skydd av lacken.",
    prices: { liten: 4000, mellan: 4900, stor: 5900, xl: 6900 },
    matches: ["lackskydd", "keramisk", "lackförsegling", "skydda lack"],
  },
  {
    key: "rostskydd",
    name: "Rostskyddsbehandling",
    description: "Underreds- och hålrumsbehandling mot rost.",
    prices: { liten: 3500, mellan: 4200, stor: 4900, xl: 5600 },
    matches: ["rostskydd", "rost", "underrede", "dinitrol"],
  },
  {
    key: "polering",
    name: "Polering / lackrenovering",
    description: "Maskinpolering som tar bort repor och swirls.",
    prices: { liten: 1800, mellan: 2200, stor: 2600, xl: 3000 },
    matches: ["polering", "polera", "repor", "swirls", "lackrenovering"],
  },
  {
    key: "stralkastare",
    name: "Strålkastarrenovering",
    description: "Slipning och lackning av matta strålkastare (fast pris).",
    prices: { liten: 900, mellan: 900, stor: 900, xl: 900 },
    matches: ["strålkastare", "blanka"],
  },
];

export function formatAmount(sek: number): string {
  return new Intl.NumberFormat("sv-SE").format(sek) + " kr";
}

/** Vilka behandlingar som ska föreslås (förbockas) för ett ärende. */
export function suggestedTreatmentKeys(lead: Lead): string[] {
  const text = `${lead.service ?? ""} ${lead.subject} ${lead.body}`.toLowerCase();
  const hits = TREATMENTS.filter((t) => t.matches.some((m) => text.includes(m))).map(
    (t) => t.key
  );
  // Om inget matchar men det är en offert/konsultation – föreslå helrekond
  if (hits.length === 0 && (lead.category === "offert" || lead.category === "konsultation")) {
    return ["helrekond"];
  }
  return hits;
}
