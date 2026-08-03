// Fordonsuppgifter via registreringsnummer.
//
// Datamodell, igenkänning av svenska regnummer i mejltext, samt demodata som
// gör att funktionen kan testas utan extern tjänst. I /api/vehicle kopplas
// detta mot en riktig leverantör (Biluppgifter.se, Car.info m.fl.) via en
// API-nyckel – se README.

export interface VehicleInfo {
  regnr: string;
  /** Bilmärke, t.ex. "Volvo" */
  brand: string;
  /** Modell, t.ex. "XC60" */
  model: string;
  /** Årsmodell, t.ex. 2020 */
  modelYear: number;
  /** Färg, t.ex. "Silvermetallic" */
  color: string;
  /** Miltal (mätarställning) i mil – senast kända vid besiktning */
  mileageMil?: number;
  /** Längd i millimeter */
  lengthMm?: number;
  /** Var uppgifterna kom ifrån */
  source: "demo" | "api";
  /** Extra notering, t.ex. om miltal är uppskattat */
  note?: string;
}

// Svenska registreringsnummer: 3 bokstäver + 3 siffror (t.ex. ABC123) eller
// 3 bokstäver + 2 siffror + 1 tecken (t.ex. ABC12D, from 2019). Tillåter
// mellanslag mellan bokstäver och siffror.
const REGNR_REGEX = /\b([A-Za-zÅÄÖåäö]{3})\s?(\d{2}[A-Za-z0-9])\b/;

/** Normaliserar ett regnummer: versaler, inga mellanslag/bindestreck. */
export function normalizeRegnr(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "").trim();
}

/** Letar efter ett regnummer i fri text (t.ex. mejlkroppen). */
export function findRegnrInText(text: string): string | null {
  const match = text.match(REGNR_REGEX);
  if (!match) return null;
  return normalizeRegnr(match[1] + match[2]);
}

/** Enkel validering av formatet. */
export function isValidRegnr(input: string): boolean {
  const norm = normalizeRegnr(input);
  return /^[A-ZÅÄÖ]{3}\d{2}[A-Z0-9]$/.test(norm);
}

// Demodata kopplad till exempelmejlen så att uppslag ger realistiska svar.
const DEMO_VEHICLES: Record<string, Omit<VehicleInfo, "regnr" | "source">> = {
  JHK427: { brand: "Volvo", model: "XC60 D4 AWD", modelYear: 2020, color: "Silvermetallic", mileageMil: 6200, lengthMm: 4688 },
  MRT881: { brand: "Volkswagen", model: "Transporter T6", modelYear: 2019, color: "Vit", mileageMil: 11800, lengthMm: 4904 },
  KLP092: { brand: "Volvo", model: "V60 T6 Recharge", modelYear: 2021, color: "Onyx Black", mileageMil: 3400, lengthMm: 4761 },
  TRS334: { brand: "BMW", model: "320d xDrive", modelYear: 2018, color: "Mineralgrå metallic", mileageMil: 9100, lengthMm: 4709 },
  OWL763: { brand: "Volvo", model: "XC90 B5 AWD", modelYear: 2022, color: "Denimblå metallic", mileageMil: 2800, lengthMm: 4953 },
  DFG215: { brand: "Audi", model: "A4 Avant 2.0 TDI", modelYear: 2017, color: "Brilliantsvart", mileageMil: 12500, lengthMm: 4726 },
  PNB540: { brand: "Toyota", model: "RAV4 Hybrid AWD", modelYear: 2020, color: "Vit pärlemor", mileageMil: 7300, lengthMm: 4600 },
  RKM118: { brand: "Mercedes-Benz", model: "Sprinter 316 CDI", modelYear: 2021, color: "Arktisvit", mileageMil: 8900, lengthMm: 5932 },
  BHT609: { brand: "Kia", model: "Ceed SW 1.4 T-GDi", modelYear: 2016, color: "Röd", mileageMil: 10400, lengthMm: 4600 },
  SVL472: { brand: "Volvo", model: "V90 D4", modelYear: 2019, color: "Osmiumgrå metallic", mileageMil: 8100, lengthMm: 4936 },
  GRD338: { brand: "Nissan", model: "Qashqai 1.6 dCi", modelYear: 2015, color: "Silvermetallic", mileageMil: 13800, lengthMm: 4377 },
  MJP701: { brand: "Volvo", model: "V40 D2", modelYear: 2017, color: "Passion Red", mileageMil: 9600, lengthMm: 4370 },
};

// Deterministiskt urval för okända regnummer så demot alltid svarar med något
// rimligt (ingen slump – samma regnr ger alltid samma bil).
const FALLBACK_BRANDS: Array<{ brand: string; model: string; lengthMm: number }> = [
  { brand: "Volvo", model: "V70", lengthMm: 4823 },
  { brand: "Volkswagen", model: "Golf", lengthMm: 4284 },
  { brand: "Audi", model: "A6", lengthMm: 4939 },
  { brand: "BMW", model: "530i", lengthMm: 4936 },
  { brand: "Toyota", model: "Corolla", lengthMm: 4370 },
  { brand: "Kia", model: "Sportage", lengthMm: 4515 },
];
const FALLBACK_COLORS = ["Svart", "Vit", "Silvermetallic", "Mörkblå metallic", "Grå", "Röd"];

function charSum(s: string): number {
  return s.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function lookupDemoVehicle(regnrRaw: string): VehicleInfo {
  const regnr = normalizeRegnr(regnrRaw);
  const known = DEMO_VEHICLES[regnr];
  if (known) {
    return { regnr, source: "demo", note: "Miltal avser senast kända vid besiktning.", ...known };
  }

  // Okänt regnr -> generera deterministiskt
  const seed = charSum(regnr);
  const car = FALLBACK_BRANDS[seed % FALLBACK_BRANDS.length];
  return {
    regnr,
    brand: car.brand,
    model: car.model,
    modelYear: 2014 + (seed % 11),
    color: FALLBACK_COLORS[seed % FALLBACK_COLORS.length],
    mileageMil: 3000 + (seed % 120) * 100,
    lengthMm: car.lengthMm,
    source: "demo",
    note: "Demodata – koppla en riktig fordonstjänst för skarpa uppgifter.",
  };
}
