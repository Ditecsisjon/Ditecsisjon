// Svarsmallar (AI-förslag). Standardmallar med platshållare som fylls i
// automatiskt. Användaren kan skriva egna mallar per ärendetyp och per tjänst
// via sidan "Svarsmallar" – de sparas och används av "Förslag"-knappen.

import type { Category, Lead } from "./types";

export const SIGNATURE = "Vänliga hälsningar,\nDitec Sisjön\nwww.ditecsisjon.com";

/** Tjänster som kan få en egen mall (utöver ärendetyperna). */
export const EDITABLE_SERVICES = [
  "Helrekond",
  "Rekonditionering",
  "Lackskydd",
  "Rostskydd",
  "Invändig rengöring",
  "Polering",
  "Strålkastarrenovering",
];

/** Platshållare som kan användas i mallarna. */
export const PLACEHOLDERS: { token: string; desc: string }[] = [
  { token: "{fornamn}", desc: "Kundens förnamn" },
  { token: "{tjanst}", desc: "Tjänsten ärendet gäller" },
  { token: "{regnr}", desc: "Registreringsnummer" },
  { token: "{signatur}", desc: "Din signatur" },
];

export const DEFAULT_TEMPLATES: Record<Category, string> = {
  offert: `Hej {fornamn}!

Tack för din förfrågan om {tjanst}. Vad roligt att du hört av dig!

För att kunna ge dig ett exakt pris tittar vi gärna på bilen. Du är välkommen att köra förbi för en snabb bedömning, eller svara med några bilder så återkommer vi med en offert.

Vill du boka en tid direkt? Föreslå gärna en dag som passar dig så löser vi det.

{signatur}`,
  bokning: `Hej {fornamn}!

Tack för din bokningsförfrågan gällande {tjanst}. Vi hjälper dig gärna!

Vi har lediga tider den kommande veckan. Vilken dag och tid passar dig bäst, så bokar vi in dig direkt?

{signatur}`,
  konsultation: `Hej {fornamn}!

Tack för din fråga om {tjanst}. Jag hjälper dig gärna att hitta rätt.

Berätta gärna lite mer om bilens skick och vad du vill uppnå, så ger jag dig en rekommendation och ett prisförslag. Vill du hellre prata i telefon? Skicka ett nummer och en tid så ringer jag upp.

{signatur}`,
  ovrigt: `Hej {fornamn}!

Tack för ditt meddelande. Jag återkommer så snart som möjligt.

{signatur}`,
};

function firstName(fullName: string): string {
  return fullName.trim().split(" ")[0] || fullName;
}

/** Fyller i platshållare i en mall utifrån ärendet. */
export function fillTemplate(tpl: string, lead: Lead): string {
  const service = lead.service ? lead.service.toLowerCase() : "vår tjänst";
  return tpl
    .replace(/\{fornamn\}/g, firstName(lead.from))
    .replace(/\{tjanst\}/g, service)
    .replace(/\{regnr\}/g, lead.regnr ?? "")
    .replace(/\{signatur\}/g, SIGNATURE)
    .replace(/[ \t]+\n/g, "\n"); // städa bort hängande mellanslag
}

/**
 * Väljer rätt mall: egen tjänst-mall först, sedan egen ärendetyp-mall, sist
 * standardmallen. Fyller sedan i platshållarna.
 */
export function suggestReply(lead: Lead, custom: Record<string, string> = {}): string {
  const byService = lead.service ? custom[lead.service] : undefined;
  const byCategory = custom[lead.category];
  const tpl =
    (byService && byService.trim()) ||
    (byCategory && byCategory.trim()) ||
    DEFAULT_TEMPLATES[lead.category];
  return fillTemplate(tpl, lead);
}

/** Standardtext för en automatisk påminnelse på en obesvarad offert. */
export function defaultReminderText(lead: Lead): string {
  const name = firstName(lead.from);
  const service = lead.service ? lead.service.toLowerCase() : "vårt förslag";
  return `Hej ${name}!

Jag ville bara höra av mig och kontrollera att du fått vår offert för ${service}. Hör gärna av dig om du har några frågor eller vill boka in en tid – vi hjälper dig gärna!

${SIGNATURE}`;
}
