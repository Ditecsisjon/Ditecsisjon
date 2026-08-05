// Server-sida: väljer en skrivbar mapp för JSON-lagring.
//
// Lokalt: projektets .data/ (överlever omstart).
// Vercel/serverless: filsystemet är skrivskyddat utom /tmp – där lagrar vi i
// stället. OBS: /tmp överlever inte en "cold start", så tekniker/kampanjstatus
// kan nollställas ibland vid hosting. För permanent lagring i molnet kan en
// databas/KV kopplas senare.

import "server-only";
import path from "path";

export function dataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  // Vercel sätter VERCEL=1; likaså andra read-only-miljöer kan sätta DATA_DIR.
  if (process.env.VERCEL) return "/tmp/ditec-data";
  return path.join(process.cwd(), ".data");
}

export function dataFile(name: string): string {
  return path.join(dataDir(), name);
}
