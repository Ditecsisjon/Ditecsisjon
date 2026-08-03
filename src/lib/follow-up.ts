// Logik för smart uppföljning av offerter som kunden inte återkommit om.
//
// Bygger på säljforskning: 80 % av affärer kräver 5+ uppföljningar, men de
// flesta ger upp efter en. Optimalt är 3–5 kontakter utspridda över ~30
// dagar, med första påminnelsen 3 dagar efter offert.

import type { Lead } from "./types";

/** Antal dagar efter offert då varje uppföljning bör skickas */
export const CADENCE_DAYS = [3, 7, 14, 30];

export interface FollowUpSuggestion {
  lead: Lead;
  /** Vilket steg i sekvensen (1-baserat) */
  step: number;
  /** Antal dagar sedan offerten skickades */
  daysSinceQuote: number;
  /** Om detta är det sista, artiga avslutsmejlet */
  isFinal: boolean;
  /** Färdigt förslag på ämnesrad */
  subject: string;
  /** Färdig mejltext att godkänna och skicka */
  body: string;
}

function daysBetween(fromISO: string, to: Date): number {
  const from = new Date(fromISO);
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function firstName(fullName: string): string {
  return fullName.trim().split(" ")[0] || fullName;
}

function formatAmount(amount?: number): string {
  if (!amount) return "";
  return new Intl.NumberFormat("sv-SE").format(amount) + " kr";
}

/**
 * Avgör om en offert behöver följas upp just nu och skapar i så fall ett
 * färdigt meddelandeförslag. Returnerar null om ingen uppföljning är aktuell.
 */
export function buildFollowUp(lead: Lead, now: Date = new Date()): FollowUpSuggestion | null {
  if (lead.status !== "offert_skickad") return null;
  if (!lead.quoteSentAt) return null;

  const daysSinceQuote = daysBetween(lead.quoteSentAt, now);
  const sent = lead.followUpsSent;

  // Alla planerade uppföljningar är gjorda -> föreslå artigt avslut
  if (sent >= CADENCE_DAYS.length) {
    return {
      lead,
      step: sent + 1,
      daysSinceQuote,
      isFinal: true,
      ...finalTemplate(lead),
    };
  }

  const scheduledDay = CADENCE_DAYS[sent];
  if (daysSinceQuote < scheduledDay) return null; // inte dags än

  return {
    lead,
    step: sent + 1,
    daysSinceQuote,
    isFinal: false,
    ...stepTemplate(lead, sent + 1),
  };
}

/** Alla offerter som behöver följas upp just nu, mest brådskande först */
export function pendingFollowUps(leads: Lead[], now: Date = new Date()): FollowUpSuggestion[] {
  return leads
    .map((l) => buildFollowUp(l, now))
    .filter((s): s is FollowUpSuggestion => s !== null)
    .sort((a, b) => b.daysSinceQuote - a.daysSinceQuote);
}

const SIGNATURE = "Vänliga hälsningar,\nDitec Sisjön\nwww.ditecsisjon.com";

function stepTemplate(lead: Lead, step: number): { subject: string; body: string } {
  const name = firstName(lead.from);
  const service = lead.service ? lead.service.toLowerCase() : "vårt uppdrag";
  const amount = formatAmount(lead.quoteAmount);
  const belopp = amount ? ` på ${amount}` : "";

  const templates: Array<{ subject: string; body: string }> = [
    // Steg 1 – vänlig påminnelse (~dag 3)
    {
      subject: `Uppföljning: din offert för ${service}`,
      body: `Hej ${name}!

Jag ville bara höra av mig och kontrollera att du fått vår offert${belopp} för ${service}. Har du några frågor eller funderingar går det bra att svara direkt på detta mejl så hjälper jag dig gärna.

${SIGNATURE}`,
    },
    // Steg 2 – erbjud hjälp/tid (~dag 7)
    {
      subject: `Kan jag hjälpa dig vidare med ${service}?`,
      body: `Hej ${name}!

Jag återkommer angående offerten för ${service} som vi skickade tidigare. Vi har några lediga tider den kommande veckan och jag bokar gärna in ett tillfälle som passar dig.

Vill du att jag ringer upp för att gå igenom upplägget? Skriv bara vilket telefonnummer och tid som passar.

${SIGNATURE}`,
    },
    // Steg 3 – skapa lite mervärde/flexibilitet (~dag 14)
    {
      subject: `Fortfarande aktuellt med ${service}?`,
      body: `Hej ${name}!

Jag vill gärna veta om ${service} fortfarande är aktuellt för dig. Om något i offerten inte känns helt rätt – omfattning, tid eller pris – så säg till, vi är flexibla och hittar en lösning som passar.

Hör gärna av dig så tar vi det därifrån.

${SIGNATURE}`,
    },
    // Steg 4 – sista mjuka knuffen (~dag 30)
    {
      subject: `Sista påminnelsen om din offert för ${service}`,
      body: `Hej ${name}!

Det var ett tag sedan vi skickade offerten för ${service} och jag vill inte vara påträngande. Vill du fortfarande gå vidare finns erbjudandet kvar – hör bara av dig så bokar vi in det.

${SIGNATURE}`,
    },
  ];

  return templates[Math.min(step - 1, templates.length - 1)];
}

function finalTemplate(lead: Lead): { subject: string; body: string } {
  const name = firstName(lead.from);
  const service = lead.service ? lead.service.toLowerCase() : "ditt ärende";
  return {
    subject: `Vi stänger ärendet – men finns kvar när du behöver oss`,
    body: `Hej ${name}!

Eftersom vi inte hörts på ett tag stänger jag detta ärende för ${service} tills vidare, så du slipper fler påminnelser. Skulle det bli aktuellt längre fram är du varmt välkommen att höra av dig – vi hjälper dig gärna då.

Ha det fint!

${SIGNATURE}`,
  };
}
