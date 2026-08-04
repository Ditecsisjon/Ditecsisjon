// SMS-kampanj för återbehandling av lackskydd.
// Månadslistan kommer från DOBS (demo här). Stödjer A/B-test av meddelanden,
// uppföljning vid uteblivet svar och automatiska svar (pris, tillgänglighet,
// rabatt vid såld bil). Prislogik återanvänds från pricing.ts och
// tillgänglighet från planner.ts.

import { sizeFromLengthMm, SIZE_LABEL, type CarSize } from "./pricing";
import { suggestSlots, formatSlot } from "./planner";

export type Variant = "A" | "B";

export type ReplyType = "ja" | "nej" | "fraga_pris" | "sald" | "fundering";

export type RecipientStatus = "ny" | "skickat" | "svarat";

/** Vilket lackskydd bilen har (styr typ av återbehandling). */
export type Coating = "ceramic_light_plus" | "ceramic_ultra" | "ditec_original";

export const COATING_LABEL: Record<Coating, string> = {
  ceramic_light_plus: "Ditec Ceramic Light+",
  ceramic_ultra: "Ditec Ceramic Ultra",
  ditec_original: "Ditec Original",
};

/** De två återbehandlingstyperna. */
export type RetreatmentType = "ceramic_underhall" | "topcoat";

export const RETREATMENT_INFO: Record<
  RetreatmentType,
  { label: string; intervalMonths: number; describe: string; includes: string }
> = {
  ceramic_underhall: {
    label: "Ceramic underhåll",
    intervalMonths: 12,
    describe:
      "underhållsbehandling som förnyar ditt keramiska lackskydd (Ceramic Light+/Ultra)",
    includes: "tvätt, dekontaminering och ny keramisk booster",
  },
  topcoat: {
    label: "Topcoat",
    intervalMonths: 18,
    describe: "återbehandling (Topcoat) som förnyar ditt Ditec Original-lackskydd",
    includes: "tvätt, dekontaminering och ny Topcoat-försegling",
  },
};

/** Ceramic Light+/Ultra -> ceramic underhåll (12 mån), Original -> topcoat (18 mån). */
export function retreatmentType(coating: Coating): RetreatmentType {
  return coating === "ditec_original" ? "topcoat" : "ceramic_underhall";
}

export interface Recipient {
  id: string;
  name: string;
  phone: string;
  regnr: string;
  car: string; // t.ex. "Volvo XC60"
  sizeMm?: number; // för storlekslogik
  service: string; // vanligtvis "Lackskydd"
  coating: Coating; // vilket lackskydd bilen har
  lastTreatment: string; // ISO – när senaste behandlingen gjordes
  variant: Variant;
  status: RecipientStatus;
  sentAt?: string;
  remindersSent: number;
  reply?: ReplyType;
  replyAt?: string;
  autoReplySent?: boolean;
}

export interface CampaignSettings {
  variantA: string;
  variantB: string;
  reminderDays: number;
  maxReminders: number;
  priceAuto: boolean;
  soldDiscountPercent: number;
  /** Priser per bilstorlek – fyll i från Configurator */
  ceramicPrices: Record<CarSize, number>;
  topcoatPrices: Record<CarSize, number>;
}

/** Tolkar en fritextinkommande SMS till ett svarstyp. */
export function classifyReply(text: string): ReplyType {
  const t = text.toLowerCase();
  if (/\b(sål|sålt|sålde|sålj|bytt bil|köpt ny|ny bil|skrota|bytte bil)/.test(t)) return "sald";
  if (/(pris|kostar|kostnad|vad blir|hur mycket|offert|vad kostar)/.test(t)) return "fraga_pris";
  if (/\b(nej|inte intresse|avstår|inte aktuell|nej tack|avboka|avbeställ)/.test(t)) return "nej";
  if (/\b(ja|japp|absolut|boka|gärna|visst|okej|ok|kör på|vill boka|jajemen)\b/.test(t))
    return "ja";
  return "fundering";
}

export const REPLY_LABEL: Record<ReplyType, string> = {
  ja: "Vill boka",
  nej: "Nej tack",
  fraga_pris: "Frågar pris",
  sald: "Bilen såld",
  fundering: "Fundering",
};

export const DEFAULT_SETTINGS: CampaignSettings = {
  variantA:
    "Hej {fornamn}! Dags för {behandling} på din {bil}. Vi förnyar lackskyddet så bilen håller sig skinande och lättare att hålla ren. Vill du boka tid? Svara JA så föreslår vi tider. /Ditec Sisjön",
  variantB:
    "Hej {fornamn}! Ditt lackskydd på {bil} är redo för {behandling} ✨ Boka nu så håller lacken toppskick. Svara JA för lediga tider, eller PRIS för offert. /Ditec Sisjön",
  reminderDays: 4,
  maxReminders: 2,
  priceAuto: true,
  soldDiscountPercent: 20,
  // Demopriser – ersätt med era priser från Configurator.
  ceramicPrices: { liten: 1495, mellan: 1795, stor: 1995, xl: 2495 },
  topcoatPrices: { liten: 1295, mellan: 1495, stor: 1795, xl: 2195 },
};

// Nytt lackskydd (för såld bil / ny bil) per storlek.
const NEW_TREATMENT_PRICE: Record<CarSize, number> = {
  liten: 4000,
  mellan: 4900,
  stor: 5900,
  xl: 6900,
};
const INVANDIG_PRICE: Record<CarSize, number> = {
  liten: 1200,
  mellan: 1500,
  stor: 1800,
  xl: 2100,
};

function kr(n: number): string {
  return new Intl.NumberFormat("sv-SE").format(n) + " kr";
}

function firstName(name: string): string {
  return name.trim().split(" ")[0] || name;
}

export function recipientSize(r: Recipient): CarSize {
  return sizeFromLengthMm(r.sizeMm);
}

/** Pris för återbehandling utifrån bilens lackskydd och storlek. */
export function retreatmentPrice(
  s: CampaignSettings,
  coating: Coating,
  size: CarSize
): number {
  return retreatmentType(coating) === "topcoat"
    ? s.topcoatPrices[size]
    : s.ceramicPrices[size];
}

export function monthsSince(iso: string, now = new Date()): number {
  const d = new Date(iso);
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

/** Är bilen mogen för återbehandling (12 mån ceramic / 18 mån topcoat)? */
export function isDue(r: Recipient, now = new Date()): boolean {
  return monthsSince(r.lastTreatment, now) >= RETREATMENT_INFO[retreatmentType(r.coating)].intervalMonths;
}

/** Fyller i platshållare i ett SMS. */
export function fillSms(tpl: string, r: Recipient): string {
  const behandling = RETREATMENT_INFO[retreatmentType(r.coating)].label;
  return tpl
    .replace(/\{fornamn\}/g, firstName(r.name))
    .replace(/\{bil\}/g, r.car || r.regnr)
    .replace(/\{regnr\}/g, r.regnr)
    .replace(/\{behandling\}/g, behandling.toLowerCase());
}

export function messageFor(r: Recipient, s: CampaignSettings): string {
  return fillSms(r.variant === "A" ? s.variantA : s.variantB, r);
}

/** Automatiskt svarsförslag beroende på kundens svar. */
export function autoReply(r: Recipient, s: CampaignSettings): string {
  const name = firstName(r.name);
  const size = recipientSize(r);
  const slots = suggestSlots(new Date().toISOString(), "lackskydd", 2)
    .map((sl) => formatSlot(sl))
    .join(" eller ");
  const tider = slots || "flera tider den kommande veckan";

  const info = RETREATMENT_INFO[retreatmentType(r.coating)];
  switch (r.reply) {
    case "fraga_pris":
      return `Hej ${name}! ${info.label} på din ${r.car} (${SIZE_LABEL[
        size
      ].toLowerCase()}) kostar ${kr(
        retreatmentPrice(s, r.coating, size)
      )}. Det är en ${info.describe}, och då ingår ${info.includes}. Vi har ${tider}. Vill du att vi passar på med invändig rengöring samtidigt? (+${kr(
        INVANDIG_PRICE[size]
      )}). /Ditec Sisjön`;
    case "ja":
      return `Vad kul, ${name}! Vi har ${tider}. Vilken passar dig bäst så bokar vi in dig direkt? /Ditec Sisjön`;
    case "sald":
      return `Tack för svaret, ${name}! Vad tråkigt att bilen sålts – men grattis till nästa 🙂 Vi ger dig ${s.soldDiscountPercent}% rabatt på ett nytt lackskydd till din nya bil (från ${kr(
        Math.round(NEW_TREATMENT_PRICE[size] * (1 - s.soldDiscountPercent / 100))
      )}). Skicka regnr så räknar vi fram exakt pris. /Ditec Sisjön`;
    case "fundering":
      return `Absolut, ${name} – berätta gärna vad du funderar på så hjälper jag dig! Vill du hellre bli uppringd? Skicka en tid som passar. /Ditec Sisjön`;
    case "nej":
      return `Tack för svaret, ${name}! Vi hör av oss igen inför nästa återbehandling. Ha det fint! /Ditec Sisjön`;
    default:
      return "";
  }
}

/** Behöver mottagaren en påminnelse just nu? */
export function needsReminder(r: Recipient, s: CampaignSettings, now = new Date()): boolean {
  if (r.status !== "skickat" || !r.sentAt) return false;
  if (r.remindersSent >= s.maxReminders) return false;
  const days = (now.getTime() - new Date(r.sentAt).getTime()) / (1000 * 60 * 60 * 24);
  return days >= s.reminderDays;
}

export interface VariantStat {
  variant: Variant;
  sent: number;
  booked: number;
  rate: number; // 0–1
}

export function variantStats(recipients: Recipient[]): VariantStat[] {
  return (["A", "B"] as Variant[]).map((v) => {
    const inV = recipients.filter((r) => r.variant === v);
    const sent = inV.filter((r) => r.sentAt).length;
    const booked = inV.filter((r) => r.reply === "ja").length;
    return { variant: v, sent, booked, rate: sent ? booked / sent : 0 };
  });
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

/** Demolista som om den kom från DOBS (kunder med lackskydd för återbehandling). */
export function sampleDobsList(): Recipient[] {
  const base: Omit<Recipient, "id" | "variant" | "status" | "remindersSent">[] = [
    { name: "Anna Bergström", phone: "070-123 45 67", regnr: "JHK427", car: "Volvo XC60", sizeMm: 4688, service: "Lackskydd", coating: "ceramic_ultra", lastTreatment: daysAgo(360) },
    { name: "Johan Lind", phone: "0708-88 77 66", regnr: "MRT881", car: "VW Transporter", sizeMm: 4904, service: "Lackskydd", coating: "ditec_original", lastTreatment: daysAgo(560) },
    { name: "Sara Nyström", phone: "073-222 11 00", regnr: "KLP092", car: "Volvo V60", sizeMm: 4761, service: "Lackskydd", coating: "ceramic_light_plus", lastTreatment: daysAgo(355) },
    { name: "Peter Alm", phone: "031-22 33 44", regnr: "TRS334", car: "BMW 320d", sizeMm: 4709, service: "Lackskydd", coating: "ceramic_ultra", lastTreatment: daysAgo(368) },
    { name: "Camilla Ek", phone: "070-999 88 77", regnr: "SVL472", car: "Volvo V90", sizeMm: 4936, service: "Lackskydd", coating: "ditec_original", lastTreatment: daysAgo(545) },
    { name: "Erik Sandberg", phone: "070-555 44 33", regnr: "BHT609", car: "Kia Ceed", sizeMm: 4600, service: "Lackskydd", coating: "ceramic_light_plus", lastTreatment: daysAgo(377) },
    { name: "Sofia Ahmed", phone: "076-321 45 98", regnr: "MJP701", car: "Volvo V40", sizeMm: 4370, service: "Lackskydd", coating: "ceramic_ultra", lastTreatment: daysAgo(359) },
    { name: "Tomas Holm", phone: "070-410 20 30", regnr: "GRD338", car: "Nissan Qashqai", sizeMm: 4377, service: "Lackskydd", coating: "ditec_original", lastTreatment: daysAgo(570) },
    { name: "Lena Fransson", phone: "070-611 22 33", regnr: "PNB540", car: "Toyota RAV4", sizeMm: 4600, service: "Lackskydd", coating: "ceramic_light_plus", lastTreatment: daysAgo(366) },
    { name: "Mikael Öberg", phone: "073-555 12 34", regnr: "DFG215", car: "Audi A4", sizeMm: 4726, service: "Lackskydd", coating: "ceramic_ultra", lastTreatment: daysAgo(358) },
  ];
  return base.map((b, i) => ({
    ...b,
    id: b.regnr,
    variant: i % 2 === 0 ? "A" : "B",
    status: "ny",
    remindersSent: 0,
  }));
}
