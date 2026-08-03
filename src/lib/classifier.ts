// Regelbaserad kategorisering – fungerar helt offline och används som
// fallback när ingen ANTHROPIC_API_KEY är satt. Samma logik körs både i
// webbläsaren (för demo) och på servern (i /api/classify).

import type { Category, Priority } from "./types";

export interface Classification {
  category: Category;
  priority: Priority;
  summary: string;
  confidence: number;
  service?: string;
}

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  offert: [
    "offert",
    "prisförslag",
    "pris",
    "kostnad",
    "kostar",
    "vad tar ni",
    "vad skulle det",
    "prisuppgift",
    "uppskattning",
    "kostnadsförslag",
  ],
  bokning: [
    "boka",
    "bokning",
    "boka in",
    "beställa",
    "beställning",
    "vill ha hjälp",
    "vill beställa",
    "kan ni komma",
    "boka tid",
    "vill boka",
  ],
  konsultation: [
    "konsultation",
    "rådgivning",
    "fråga om",
    "undrar",
    "möjligt att",
    "går det att",
    "rekommend",
    "vilken tjänst",
    "hur fungerar",
    "hjälp med att välja",
  ],
  ovrigt: [
    "faktura",
    "reklamation",
    "klagomål",
    "samarbete",
    "leverantör",
    "jobb",
    "anställning",
    "praktik",
    "nyhetsbrev",
  ],
};

const SERVICE_KEYWORDS: Record<string, string[]> = {
  Flyttstädning: ["flyttstäd", "flytt"],
  Hemstädning: ["hemstäd", "hemma", "veckostäd", "städhjälp hemma"],
  Kontorsstädning: ["kontor", "företagsstäd", "lokalvård"],
  Fönsterputs: ["fönster", "fönsterputs", "putsa"],
  Byggstädning: ["bygg", "byggstäd", "renovering"],
  Storstädning: ["storstäd", "grovstäd"],
  Trappstädning: ["trapp", "trapphus"],
};

const HIGH_PRIORITY_SIGNALS = [
  "akut",
  "omgående",
  "snarast",
  "idag",
  "imorgon",
  "asap",
  "brådskande",
  "så snart",
];

function detectService(text: string): string | undefined {
  for (const [service, words] of Object.entries(SERVICE_KEYWORDS)) {
    if (words.some((w) => text.includes(w))) return service;
  }
  return undefined;
}

function estimatePriority(text: string, category: Category): Priority {
  if (HIGH_PRIORITY_SIGNALS.some((s) => text.includes(s))) return "hog";
  if (category === "bokning" || category === "offert") return "medel";
  if (category === "ovrigt") return "lag";
  return "medel";
}

/**
 * Poängsätter varje kategori utifrån hur många nyckelord som matchar och
 * väljer den med högst poäng. Enkel men transparent – lätt att förstå
 * varför ett mejl hamnade i en viss kategori.
 */
export function classifyByRules(subject: string, body: string): Classification {
  const text = `${subject}\n${body}`.toLowerCase();

  const scores: Record<Category, number> = {
    offert: 0,
    bokning: 0,
    konsultation: 0,
    ovrigt: 0,
  };

  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const word of words) {
      if (text.includes(word)) scores[cat as Category] += 1;
    }
  }

  let best: Category = "konsultation";
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = cat as Category;
    }
  }

  const totalHits = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalHits === 0 ? 0.4 : Math.min(0.95, 0.5 + bestScore / (totalHits + 1));

  const service = detectService(text);
  const priority = estimatePriority(text, best);

  const summary =
    bestScore === 0
      ? "Kunde inte avgöra med säkerhet – granska manuellt."
      : `Troligen ${labelFor(best)}${service ? ` gällande ${service.toLowerCase()}` : ""}.`;

  return { category: best, priority, summary, confidence, service };
}

function labelFor(cat: Category): string {
  return {
    offert: "offertförfrågan",
    bokning: "direktbokning",
    konsultation: "konsultationsfråga",
    ovrigt: "övrigt ärende",
  }[cat];
}
