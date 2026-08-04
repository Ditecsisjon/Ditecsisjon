# Koppla externa system (DOBS, Configurator, verkstadsplanerare)

Appen är byggd med **pluggbara kopplingar**. Allt fungerar i demoläge nu, och
blir skarpt så fort vi får åtkomst till respektive system. Här är exakt vad som
behövs för varje koppling. Fyll i värdena i `.env.local` (eller hos Vercel).

> Det här är sånt bara ni/leverantören har (adresser, nycklar, dataformat).
> Skicka det ni har så kopplar vi in det – eller sätt oss i kontakt med
> leverantörens support.

---

## 1. DOBS – månadslista för återbehandling
**Vad vi behöver:** en URL vi kan hämta listan från (eller en export/fil).

- `DOBS_API_URL` – adress som svarar med JSON.
- `DOBS_API_KEY` – ev. nyckel/token.

**Förväntat svar** (`{ recipients: [...] }`), ett objekt per kund:
```json
{
  "recipients": [
    {
      "id": "ABC123",
      "name": "Anna Bergström",
      "phone": "070-123 45 67",
      "regnr": "ABC123",
      "car": "Volvo XC60",
      "sizeMm": 4688,
      "service": "Lackskydd",
      "coating": "ceramic_ultra",        // ceramic_light_plus | ceramic_ultra | ditec_original
      "lastTreatment": "2024-08-01T00:00:00.000Z"
    }
  ]
}
```
Har DOBS andra fältnamn? Skicka ett exempel så mappar vi om det.
*Alternativ:* exportera listan som CSV/Excel varje månad – så bygger vi en
import-knapp för filen istället.

---

## 2. Configurator – priser per storlek
**Vad vi behöver:** hur priserna för återbehandling (Ceramic underhåll &
Topcoat) per bilstorlek nås.

- Har Configurator ett API? → `CONFIGURATOR_API_URL` (+ `CONFIGURATOR_API_KEY`).
- Annars: skicka prislistan (liten/mellan/stor/XL för Ceramic underhåll resp.
  Topcoat) så lägger vi in den. Priserna går även att fylla i direkt i appen
  under **SMS-kampanj → Inställningar**.

---

## 3. Verkstadsplanerare – tider, tekniker & kompetenser
**Vad vi behöver:** åtkomst till schema och tekniker.

**a) Tillgänglighet** (för tidsbokningskollen)
- `PLANNER_API_URL` – tar emot `{ requestedISO, competence, service }` och svarar:
```json
{
  "requested": { "available": true, "technician": "Namn", "dateLabel": "tisdag 5 augusti", "slotLabel": "11:00–14:00" },
  "suggestions": [
    { "startISO": "2026-08-06T08:00:00.000Z", "dateLabel": "onsdag 6 augusti", "slotLabel": "08:00–11:00", "technician": "Namn" }
  ]
}
```

**b) Verkstadsinfo** (tekniker, kompetenser, veckoschema – för Verkstad-vyn)
- `PLANNER_INFO_URL` – GET som svarar:
```json
{
  "technicians": [
    { "id": "t1", "name": "Erik", "competences": ["rekond","lackskydd","rostskydd"] }
  ],
  "competenceLabels": { "rekond": "Rekonditionering", "lackskydd": "Lackskydd" },
  "week": { "days": [{ "dateISO": "...", "label": "mån 4 aug" }], "grid": { "t1": { "<dateISO>": { "booked": 1, "free": 2, "slots": [] } } } }
}
```
- `PLANNER_API_KEY` – ev. nyckel för båda ovan.

Kompetensnycklar som appen känner igen: `helrekond`, `rekond`, `lackskydd`,
`rostskydd`, `invandig`, `polering`, `stralkastare`. Fler kan läggas till.

---

## Vad du gör nu
Skicka det du har för respektive system (URL/nyckel eller ett exempel på datan),
eller koppla oss till leverantörens support. Tills dess visar appen demovärden så
allt går att testa och känna på.
