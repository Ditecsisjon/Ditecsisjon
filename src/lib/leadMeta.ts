import type { Lead } from "./types";

/**
 * Stabil nyckel för att koppla historik och påminnelser till ett ärende, även
 * när mejl-ID:n ändras vid ny hämtning. Prioriterar regnummer (unikt per bil),
 * sedan e-post, sist mejl-ID.
 */
export function leadKey(lead: Lead): string {
  return lead.regnr || lead.email || lead.id;
}
