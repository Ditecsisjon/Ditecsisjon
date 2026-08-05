import "server-only";
import { normalizeRegnr, type VehicleInfo } from "./vehicle";

// Gratis fordonsuppslag genom att skrapa Transportstyrelsens publika tjänst
// "Fordonsuppgifter" (fordon-fu-regnr.transportstyrelsen.se). Grundläggande
// fordonsuppgifter är offentliga och gratis (ägaruppgifter kräver SMS – dem
// hämtar vi INTE här).
//
// OBS:
// - Kräver att `playwright` är installerat (npm i -D playwright && npx playwright
//   install chromium). Utan det returneras null och /api/vehicle faller tillbaka
//   på demodata.
// - Fungerar lokalt (t.ex. din Windows). Fungerar INTE på Vercels serverless-
//   funktioner (ingen webbläsare) – kör då hellre med demodata eller en API-
//   leverantör.
// - Transportstyrelsen kan visa en reCAPTCHA. Vid låg volym (ett uppslag när du
//   öppnar ett mejl) går det oftast igenom; annars använd länken i appen.

const BASE = "https://fordon-fu-regnr.transportstyrelsen.se/";

/** Plockar värdet efter en etikett ur resultatsidans text. */
function valueAfter(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    // t.ex. "Fabrikat VOLVO" eller "Fabrikat: VOLVO" på egen rad
    const re = new RegExp(
      `${label}\\s*:?\\s*\\n?\\s*([^\\n]{1,60})`,
      "i"
    );
    const m = text.match(re);
    if (m && m[1]) {
      const v = m[1].trim();
      if (v && !/^(uppgift saknas|-|–)$/i.test(v)) return v;
    }
  }
  return undefined;
}

function toNumber(v?: string): number | undefined {
  if (!v) return undefined;
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function scrapeTransportstyrelsen(
  regnrRaw: string
): Promise<VehicleInfo | null> {
  const regnr = normalizeRegnr(regnrRaw);

  // Dynamisk import så appen bygger/kör även utan playwright installerat.
  // Typerna hålls som any så projektet kompilerar utan playwright som beroende.
  let chromium: any;
  try {
    // Dynamisk specifier så bundlern inte försöker lösa upp paketet vid bygget.
    const mod = ["play", "wright"].join("");
    const pw: any = await import(mod);
    chromium = pw.chromium;
  } catch {
    return null; // playwright saknas
  }

  let browser: any = null;
  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      locale: "sv-SE",
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Fyll i regnr och sök. Fältets id har historiskt varit #ts-regnr-sok,
    // men vi provar flera selektorer för robusthet.
    const inputSel = [
      "#ts-regnr-sok",
      'input[name="registreringsnummer"]',
      'input[type="search"]',
      'input[type="text"]',
    ];
    let filled = false;
    for (const sel of inputSel) {
      const el = await page.$(sel);
      if (el) {
        await el.fill(regnr);
        filled = true;
        break;
      }
    }
    if (!filled) return null;

    // Skicka formuläret (Enter eller submit-knapp).
    await page.keyboard.press("Enter");
    await page
      .waitForLoadState("networkidle", { timeout: 20000 })
      .catch(() => {});

    const bodyText = (await page.textContent("body")) ?? "";

    // Om reCAPTCHA eller ingen träff – ge upp tyst (fallback till demo).
    if (/recaptcha/i.test(bodyText) && !/Fabrikat/i.test(bodyText)) return null;
    if (/hittade inget fordon|kunde inte hitta/i.test(bodyText)) return null;

    const brand = valueAfter(bodyText, ["Fabrikat"]);
    const model = valueAfter(bodyText, [
      "Handelsbeteckning",
      "Fordonsbenämning",
      "Modell",
    ]);
    const color = valueAfter(bodyText, ["Färg"]);
    const modelYear = toNumber(
      valueAfter(bodyText, ["Fordonsår", "Årsmodell", "Tillverkningsår"])
    );
    const lengthMm = toNumber(valueAfter(bodyText, ["Längd"]));
    const mileageMil = toNumber(
      valueAfter(bodyText, ["Mätarställning", "Miltal"])
    );

    if (!brand && !model) return null; // fick inget vettigt

    return {
      regnr,
      brand: brand ?? "Okänt",
      model: model ?? "Okänd",
      modelYear: modelYear ?? 0,
      color: color ?? "Okänd",
      mileageMil,
      lengthMm,
      source: "scrape",
      note: "Hämtat från Transportstyrelsen (gratis).",
    };
  } catch {
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
