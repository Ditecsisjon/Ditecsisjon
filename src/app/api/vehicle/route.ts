// Hämtar fordonsuppgifter för ett registreringsnummer.
//
// Demoläge (utan konfiguration): returnerar realistisk demodata.
// Skarpt läge: sätt VEHICLE_API_URL och VEHICLE_API_KEY i .env.local så
// anropas din valda leverantör (Biluppgifter.se, Car.info m.fl.). Fältnamnen
// skiljer sig mellan leverantörer – justera mappningen i mapProviderResponse.

import { NextResponse } from "next/server";
import {
  isValidRegnr,
  lookupDemoVehicle,
  normalizeRegnr,
  type VehicleInfo,
} from "@/lib/vehicle";

export const runtime = "nodejs";

function pick(obj: any, keys: string[]): any {
  for (const k of keys) {
    const parts = k.split(".");
    let val = obj;
    for (const p of parts) val = val?.[p];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return undefined;
}

/** Mappar en leverantörs JSON till vår VehicleInfo. Justera vid behov. */
function mapProviderResponse(regnr: string, data: any): VehicleInfo {
  const num = (v: any) => (v == null ? undefined : Number(String(v).replace(/\s/g, "")));
  return {
    regnr,
    brand: pick(data, ["brand", "make", "manufacturer", "marke", "fabrikat"]) ?? "Okänt",
    model: pick(data, ["model", "modell", "type"]) ?? "Okänd",
    modelYear: num(pick(data, ["modelYear", "arsmodell", "year", "vehicleYear"])) ?? 0,
    color: pick(data, ["color", "colour", "farg"]) ?? "Okänd",
    mileageMil: num(pick(data, ["mileageMil", "miltal", "matarstallning", "odometerMil"])),
    lengthMm: num(pick(data, ["lengthMm", "langd", "length"])),
    source: "api",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("regnr") ?? "";

  if (!raw.trim()) {
    return NextResponse.json({ error: "regnr krävs" }, { status: 400 });
  }
  if (!isValidRegnr(raw)) {
    return NextResponse.json(
      { error: "Ogiltigt registreringsnummer (format ABC123 eller ABC12D)" },
      { status: 400 }
    );
  }

  const regnr = normalizeRegnr(raw);
  const apiUrl = process.env.VEHICLE_API_URL;
  const apiKey = process.env.VEHICLE_API_KEY;

  if (apiUrl && apiKey) {
    try {
      const url = apiUrl.includes("{regnr}")
        ? apiUrl.replace("{regnr}", encodeURIComponent(regnr))
        : `${apiUrl}${apiUrl.includes("?") ? "&" : "?"}regnr=${encodeURIComponent(regnr)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
          accept: "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(mapProviderResponse(regnr, data));
      }
      // Faller tillbaka på demo om leverantören svarar med fel
    } catch {
      // Nätverksfel -> demo nedan
    }
  }

  // Gratis scraper mot Transportstyrelsen (valfritt, kräver playwright lokalt).
  // Slå på med VEHICLE_SCRAPE=transportstyrelsen i .env.local.
  if (process.env.VEHICLE_SCRAPE === "transportstyrelsen") {
    try {
      const { scrapeTransportstyrelsen } = await import(
        "@/lib/vehicleScrape.server"
      );
      const scraped = await scrapeTransportstyrelsen(regnr);
      if (scraped) return NextResponse.json(scraped);
    } catch {
      // faller tillbaka på demo nedan
    }
  }

  return NextResponse.json(lookupDemoVehicle(regnr));
}
