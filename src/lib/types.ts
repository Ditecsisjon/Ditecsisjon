// Datamodell för Ditec Inkorg

/** Vad mejlet gäller – bestäms av AI-kategoriseringen */
export type Category = "offert" | "bokning" | "konsultation" | "ovrigt";

/** Var i processen ärendet befinner sig */
export type Status =
  | "ny" // Inkommen, ej hanterad
  | "obesvarad" // Läst men inte besvarad
  | "besvarad" // Vi har svarat (utan formell offert)
  | "offert_skickad" // Offert skickad, väntar på kundens svar
  | "bokad" // Kund har bokat / tackat ja
  | "ingen_affar"; // Tackat nej eller avslutat

/** Prioritet – sätts av AI utifrån innehåll och belopp */
export type Priority = "hog" | "medel" | "lag";

/** Kanaler ett meddelande kan komma in på */
export type Channel = "email" | "webbformular" | "telefon";

export interface Lead {
  id: string;
  /** Kundens namn */
  from: string;
  email: string;
  phone?: string;
  subject: string;
  /** Kort förhandsvisning i listan */
  preview: string;
  /** Hela mejltexten */
  body: string;
  /** ISO-datum när mejlet kom in */
  receivedAt: string;
  channel: Channel;
  category: Category;
  status: Status;
  priority: Priority;
  /** Vilken tjänst det gäller, t.ex. "Rekonditionering" */
  service?: string;
  /** Kundens registreringsnummer om det nämnts i mejlet */
  regnr?: string;
  /** ISO-datum då offert skickades (om status = offert_skickad) */
  quoteSentAt?: string;
  /** Offertbelopp i SEK */
  quoteAmount?: number;
  /** ISO-datum för senaste kontakt från oss */
  lastContactAt?: string;
  /** Hur många uppföljningar som redan skickats på offerten */
  followUpsSent: number;
  /** AI-genererad kort sammanfattning */
  aiSummary?: string;
  /** AI:s säkerhet på kategoriseringen (0–1) */
  aiConfidence?: number;
  /** Oläst konversation – markeras i blått i listan */
  unread?: boolean;
}

/** Ett meddelande i en konversationstråd */
export interface Message {
  id: string;
  /** "in" = från kunden, "out" = skickat från oss */
  direction: "in" | "out";
  body: string;
  /** ISO-datum */
  at: string;
  /** Filnamn på bifogade filer */
  attachments?: string[];
}

export const CATEGORY_LABELS: Record<Category, string> = {
  offert: "Offertförfrågan",
  bokning: "Direktbokning",
  konsultation: "Konsultation",
  ovrigt: "Övrigt",
};

export const STATUS_LABELS: Record<Status, string> = {
  ny: "Ny",
  obesvarad: "Obesvarad",
  besvarad: "Besvarad",
  offert_skickad: "Offert skickad",
  bokad: "Bokad",
  ingen_affar: "Ingen affär",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  hog: "Hög",
  medel: "Medel",
  lag: "Låg",
};

/** Ordning för pipeline/kanban-vyn */
export const PIPELINE_ORDER: Status[] = [
  "ny",
  "obesvarad",
  "besvarad",
  "offert_skickad",
  "bokad",
  "ingen_affar",
];
