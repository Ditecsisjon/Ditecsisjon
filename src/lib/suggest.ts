// Genererar förslag på svarstext utifrån ärendets typ, tjänst och bil.
// Körs direkt i webbläsaren (inget API krävs) så förslaget kommer omedelbart.

import type { Lead } from "./types";

const SIGNATURE = "Vänliga hälsningar,\nDitec Sisjön\nwww.ditecsisjon.com";

function firstName(fullName: string): string {
  return fullName.trim().split(" ")[0] || fullName;
}

/** Ett färdigt förslag på svar anpassat efter ärendet. */
export function suggestReply(lead: Lead): string {
  const name = firstName(lead.from);
  const service = lead.service ? lead.service.toLowerCase() : "vår tjänst";
  const car = lead.regnr ? ` (reg.nr ${lead.regnr})` : "";

  switch (lead.category) {
    case "offert":
      return `Hej ${name}!

Tack för din förfrågan om ${service}${car}. Vad roligt att du hört av dig!

För att kunna ge dig ett exakt pris tittar vi gärna på bilen. Du är välkommen att köra förbi för en snabb bedömning, eller svara med några bilder så återkommer vi med en offert.

Vill du boka en tid direkt? Föreslå gärna en dag som passar dig så löser vi det.

${SIGNATURE}`;

    case "bokning":
      return `Hej ${name}!

Tack för din bokningsförfrågan gällande ${service}${car}. Vi hjälper dig gärna!

Vi har lediga tider den kommande veckan. Vilken dag och tid passar dig bäst, så bokar vi in dig direkt?

${SIGNATURE}`;

    case "konsultation":
      return `Hej ${name}!

Tack för din fråga om ${service}${car}. Jag hjälper dig gärna att hitta rätt.

Berätta gärna lite mer om bilens skick och vad du vill uppnå, så ger jag dig en rekommendation och ett prisförslag. Vill du hellre prata i telefon? Skicka ett nummer och en tid så ringer jag upp.

${SIGNATURE}`;

    default:
      return `Hej ${name}!

Tack för ditt meddelande. Jag återkommer så snart som möjligt.

${SIGNATURE}`;
  }
}

/** Standardtext för en automatisk påminnelse på en obesvarad offert. */
export function defaultReminderText(lead: Lead): string {
  const name = firstName(lead.from);
  const service = lead.service ? lead.service.toLowerCase() : "vårt förslag";
  return `Hej ${name}!

Jag ville bara höra av mig och kontrollera att du fått vår offert för ${service}. Hör gärna av dig om du har några frågor eller vill boka in en tid – vi hjälper dig gärna!

${SIGNATURE}`;
}
