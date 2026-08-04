// Server-sida: lagrar era tekniker + kompetenser (så planeraren blir er egen).
// JSON-fil; faller tillbaka på inbyggda demotekniker om inget sparats.

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { TECHNICIANS, type Technician } from "./planner";

const FILE = path.join(process.cwd(), ".data", "technicians.json");

export async function readTechnicians(): Promise<Technician[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : TECHNICIANS;
  } catch {
    return TECHNICIANS;
  }
}

export async function writeTechnicians(list: Technician[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2), "utf8");
}
