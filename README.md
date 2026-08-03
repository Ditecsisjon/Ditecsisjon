# Ditec Inkorg

En egen inkorg- och offertuppföljningsapp för **Ditec Sisjön** – byggd för att ge
överblick över inkommande mejl, kategorisera dem automatiskt (offertförfrågan,
direktbokning, konsultation, övrigt) och aldrig missa att följa upp en offert som
kunden inte återkommit om.

> **Status:** Fungerande prototyp med exempeldata (demoläge). Redo att kopplas
> mot din riktiga Gmail i steg 2.

## Vad appen gör

| Vy | Funktion |
|----|----------|
| **Inkorg** (startvy) | Mejlklient-layout: konversationslista till vänster (olästa markerade i blått), mejltråd uppe till höger och en skrivruta med bifogning nere till höger. Fordonsuppgifter för vald offert visas i en rad högst upp. |
| **Fordonsuppslag** | När du öppnar ett mejl hämtas fordonsuppgifter automatiskt från regnumret i mejlet: bilmärke, modell, årsmodell, färg, mätarställning och längd – visas både i toppraden och i ärendets detaljvy. |
| **Översikt** | Nyckeltal (obesvarade, offerter i pipeline, uppföljningar, bokade), "att hantera"-lista och fördelning per kategori. |
| **Pipeline** | Kanban-vy: `Ny → Obesvarad → Besvarad → Offert skickad → Bokad / Ingen affär`, med summerat offertvärde per steg. |
| **Uppföljningar** | Offerter utan svar flaggas automatiskt. Appen skriver ett färdigt uppföljningsmejl som du redigerar och godkänner – ett klick för att skicka. |

### Smart uppföljning
Bygger på säljforskning: 80 % av affärer kräver 5+ uppföljningar men de flesta ger
upp efter en. Appen föreslår uppföljning efter **3, 7, 14 och 30 dagar** och till
sist ett artigt avslutsmejl. Se `src/lib/follow-up.ts`.

### AI-kategorisering
Nya mejl kan klassificeras av Claude (kategori, prioritet, tjänst och en kort
sammanfattning). Utan API-nyckel används automatiskt en regelbaserad
kategorisering så att appen alltid fungerar. Se `src/app/api/classify/route.ts`
och `src/lib/classifier.ts`.

### Fordonsuppgifter via regnummer
När ett mejl öppnas letar appen efter ett svenskt registreringsnummer i texten
och hämtar automatiskt fordonsuppgifter (bilmärke, modell, årsmodell, färg,
miltal och längd). Du kan också skriva in ett regnummer manuellt, samt infoga
bilinfon i svaret med ett klick.

I demoläge används inbyggd exempeldata. För skarpa uppgifter, koppla en svensk
fordonstjänst genom att sätta `VEHICLE_API_URL` och `VEHICLE_API_KEY` i
`.env.local`:

| Tjänst | Sida |
|--------|------|
| Biluppgifter.se (API) | <https://apidocs.biluppgifter.se/> |
| Car.info (B2B API) | <https://www.car.info/sv-se/b2b/api> |
| Checkbiz | <https://checkbiz.se/data/fordon/> |
| Fordonsfakta | <https://fordonsfakta.se/> |

De flesta kräver API-nyckel och ibland tillstånd för direktåtkomst från
Transportstyrelsen. Fältnamnen skiljer sig mellan leverantörer – justera
mappningen i `mapProviderResponse` i `src/app/api/vehicle/route.ts`. Använd
`{regnr}` som platshållare i URL:en om leverantören vill ha regnumret i
sökvägen. **Obs:** miltal/mätarställning i registret är "senast kända vid
besiktning", inte realtid.

## Kom igång

```bash
npm install
npm run dev
```

Öppna http://localhost:3000

Appen fungerar direkt med exempeldata – ingen konfiguration behövs.

## Steg 2 – slå på AI-kategorisering (valfritt)

1. Skapa en API-nyckel på <https://console.anthropic.com/>.
2. Kopiera `.env.example` till `.env.local` och fyll i:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ANTHROPIC_MODEL=claude-sonnet-5
   ```
3. Starta om appen. Nya mejl klassificeras nu av Claude; annars används reglerna.

Testa direkt via API:t:
```bash
curl -X POST http://localhost:3000/api/classify \
  -H "content-type: application/json" \
  -d '{"subject":"Offert rekond","body":"Vad kostar en helrekond av min Volvo XC60?"}'
```

Testa fordonsuppslaget:
```bash
curl "http://localhost:3000/api/vehicle?regnr=JHK427"
```

## Koppla din Gmail (offert.ditec@gmail.com)

Appen hämtar och skickar mejl direkt via Gmails IMAP/SMTP med ett **app-lösenord**
– enklare än OAuth och kräver inget Google Cloud-projekt.

1. Slå på **2-stegsverifiering**: <https://myaccount.google.com/security>
2. Skapa ett **app-lösenord** (16 tecken): <https://myaccount.google.com/apppasswords>
3. Kopiera `.env.example` till `.env.local` och fyll i app-lösenordet:
   ```
   IMAP_HOST=imap.gmail.com
   IMAP_PORT=993
   IMAP_SECURE=true
   IMAP_USER=offert.ditec@gmail.com
   IMAP_PASSWORD=app-lösenordet-16-tecken
   IMAP_MAILBOX=INBOX
   MAIL_FETCH_LIMIT=40

   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_FROM=offert.ditec@gmail.com
   ```
4. Starta om appen (`npm run dev`). Inkorgen hämtar de senaste mejlen automatiskt
   vid start; uppdatera manuellt med ↻-knappen bredvid "Alla konversationer".

Varje inkommet mejl körs genom kategoriseringen (offert/bokning/konsultation/
övrigt) och regnummer plockas automatiskt ur texten för fordonsuppslaget. Svar
och uppföljningar skickas via samma app-lösenord (SMTP). Utan konfiguration
körs appen i demoläge med exempeldata.

**Säkerhet:** `.env.local` är gitignore:at – app-lösenordet hamnar aldrig i
koden och kan återkallas när som helst på apppasswords-sidan. IMAP/SMTP sker på
serversidan, så kör appen som en riktig server (inte statisk sajt). Se
`src/lib/mail.ts`, `src/lib/mailer.ts` och `src/app/api/mail/*`.

> **Ny på Windows?** Följ den enkla steg-för-steg-guiden i **[SETUP.md](SETUP.md)**
> – dubbelklicka på `start.bat` så installeras och startas allt automatiskt.

> **Alternativ – Websupport eller annan e-post:** appen fungerar med vilken
> IMAP/SMTP-brevlåda som helst. Byt bara `IMAP_HOST`/`SMTP_HOST` (t.ex.
> `imap.websupport.se` / `smtp.websupport.se`) och använd brevlådans lösenord.

## Teknik

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** för gränssnittet
- **lucide-react** för ikoner
- Ingen databas i prototypen – state hålls i minnet (`src/lib/store.tsx`). I steg
  3 kan detta bytas mot t.ex. Gmail som källa + en enkel databas för status.

## Projektstruktur

```
src/
├── app/
│   ├── page.tsx            Inkorg (startvy) – konversationer, tråd, skrivruta
│   ├── oversikt/page.tsx   Översikt / dashboard
│   ├── pipeline/page.tsx   Kanban-pipeline
│   ├── follow-up/page.tsx  Uppföljningsförslag
│   └── api/
│       ├── classify/       AI-kategorisering (med regel-fallback)
│       └── vehicle/        Fordonsuppslag via regnummer (demo + leverantör)
├── components/             UI-komponenter (badges, rader, detaljvy m.m.)
└── lib/
    ├── types.ts            Datamodell
    ├── sample-data.ts      Exempeldata (byts mot Gmail i steg 3)
    ├── classifier.ts       Regelbaserad kategorisering
    ├── follow-up.ts        Uppföljningslogik + mallar
    ├── vehicle.ts          Fordonslogik + regnummer + demodata
    └── store.tsx           State-hantering
```
