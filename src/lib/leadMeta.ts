import type { Lead, Message } from "./types";

/**
 * Stabil nyckel för att koppla historik och påminnelser till ett ärende, även
 * när mejl-ID:n ändras vid ny hämtning. Prioriterar regnummer (unikt per bil),
 * sedan e-post, sist mejl-ID.
 */
export function leadKey(lead: Lead): string {
  return lead.regnr || lead.email || lead.id;
}

/**
 * Har kunden svarat? Sant om kunden bokat/tackat nej, eller om det finns ett
 * inkommande meddelande efter vårt senaste utgående (dvs kunden återkommit).
 * Styr den mörkare avataren med svart ring.
 */
export function customerResponded(lead: Lead, thread?: Message[]): boolean {
  if (lead.status === "bokad" || lead.status === "ingen_affar") return true;
  if (!thread || thread.length === 0) return false;
  const outTimes = thread
    .filter((m) => m.direction === "out")
    .map((m) => +new Date(m.at));
  if (outTimes.length === 0) return false;
  const lastOut = Math.max(...outTimes);
  return thread.some((m) => m.direction === "in" && +new Date(m.at) > lastOut);
}
