# Verkstadsplanerare – Ditec Sisjön

Webbapp för att planera bilarna i verkstaden. Varje arbetsorder har en knapp
**"Lev klar"** som markerar bilen som klar för leverans och skickar ett SMS
till kunden om att bilen går att hämta.

## Funktioner

- Tavla med kolumnerna **Inlämnad → Pågående → Lev klar**, plus arkiv för levererade bilar
- Lägg till, ändra och ta bort arbetsordrar (reg.nr, bilmodell, kund, mobil, arbete, datum, anteckning)
- **Lev klar-knapp på varje arbetsorder efter inlämning** – förhandsgranska och redigera SMS:et
  innan det skickas, eller markera klar utan SMS
- SMS-status per bil (skickat / testläge / fel) och möjlighet att skicka igen
- Sidan uppdaterar sig själv var 15:e sekund – funkar bra på en skärm i verkstaden
- Fungerar på mobil

## Kom igång

Kräver Node.js 18 eller nyare (22.13+ rekommenderas – då lagras allt i SQLite,
annars i en JSON-fil). Inga paket behöver installeras.

```bash
node server.js
```

Öppna sedan <http://localhost:3000>.

## SMS-inställningar (46elks)

Utan inställningar körs appen i **testläge**: SMS:et loggas i terminalen men
skickas inte, och appen visar "SMS: testläge" i sidhuvudet.

För riktiga SMS:

1. Skapa konto på [46elks.se](https://46elks.se) och hämta API-nyckel (användarnamn + lösenord)
2. Kopiera `.env.example` till `.env` och fyll i uppgifterna:

| Variabel | Beskrivning |
| --- | --- |
| `ELKS_API_USERNAME` | API-användarnamn från 46elks |
| `ELKS_API_PASSWORD` | API-lösenord från 46elks |
| `SMS_FROM` | Avsändarnamn hos kunden (max 11 tecken, t.ex. `DitecSisjon`) |
| `SMS_TEMPLATE` | Egen SMS-mall (valfritt). Platshållare: `{namn}`, `{regnr}`, `{bil}` |
| `PORT` | Port för webbservern (standard 3000) |

3. Starta om servern.

Telefonnummer normaliseras automatiskt (`070-123 45 67` → `+46701234567`).

Vill du använda en annan SMS-leverantör (t.ex. Twilio eller HelloSMS) är allt
utskick samlat i `lib/sms.js`.

## Data

Allt sparas i mappen `data/` (`verkstad.db` för SQLite eller `jobs.json`).
Ta backup på den mappen. Mappen är exkluderad från git.

## API (kort)

| Metod & sökväg | Gör |
| --- | --- |
| `GET /api/jobs?view=aktiva\|levererade\|alla` | Lista bilar |
| `POST /api/jobs` | Lägg till bil |
| `PATCH /api/jobs/:id` | Ändra bil/status |
| `POST /api/jobs/:id/ready` | Markera klar för leverans (+ ev. SMS), body: `{ "send": true, "message": "..." }` |
| `POST /api/jobs/:id/sms` | Skicka (om) SMS utan att ändra status |
| `POST /api/jobs/:id/delivered` | Markera levererad |
| `DELETE /api/jobs/:id` | Ta bort bil |
