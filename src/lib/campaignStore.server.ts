// Server-sida: enkel delad lagring av kampanjen så att inkommande SMS (webhook)
// kan matcha kunder och uppdatera status. Lagras som JSON-fil (fungerar när
// appen körs som egen server). Vid hosting utan skrivbar disk byts detta mot
// en databas/KV senare.

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_SETTINGS, type CampaignSettings, type Recipient } from "./campaign";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "campaign.json");

export interface CampaignState {
  recipients: Recipient[];
  settings: CampaignSettings;
}

export async function readState(): Promise<CampaignState> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      recipients: parsed.recipients ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return { recipients: [], settings: DEFAULT_SETTINGS };
  }
}

export async function writeState(state: CampaignState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(state, null, 2), "utf8");
}

/** Normaliserar telefonnummer för matchning (siffror + ev. +). */
function normPhone(p: string): string {
  const digits = p.replace(/[^\d]/g, "");
  // ta bort inledande 0 och landskod-varianter för lösare matchning
  return digits.replace(/^0+/, "").replace(/^46/, "");
}

export function findByPhone(recipients: Recipient[], phone: string): Recipient | undefined {
  const target = normPhone(phone);
  return recipients.find((r) => normPhone(r.phone) === target);
}
