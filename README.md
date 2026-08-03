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

## Hämta riktiga mejl via IMAP (Websupport)

Mejlen från Eniro m.fl. kommer till `info@ditecsisjon.se` som ligger hos
Websupport. Appen kan hämta dem direkt via IMAP – standardprotokoll, ingen
OAuth krävs.

1. Kopiera `.env.example` till `.env.local` och fyll i:
   ```
   IMAP_HOST=imap.websupport.se
   IMAP_PORT=993
   IMAP_SECURE=true
   IMAP_USER=info@ditecsisjon.se
   IMAP_PASSWORD=ditt-lösenord
   IMAP_MAILBOX=INBOX
   MAIL_FETCH_LIMIT=40
   ```
2. Starta om appen (`npm run dev`). Inkorgen hämtar nu de senaste mejlen
   automatiskt vid start, och du kan uppdatera manuellt med
   ↻-knappen bredvid "Alla konversationer".

Varje inkommet mejl körs genom kategoriseringen (offert/bokning/konsultation/
övrigt) och regnummer plockas automatiskt ur texten för fordonsuppslaget.

**Säkerhet:** `.env.local` är gitignore:at – lösenordet hamnar aldrig i koden.
Kör helst appen på en egen server/dator, inte som statisk sajt, eftersom IMAP
sker på serversidan. Se `src/lib/mail.ts` och `src/app/api/mail/sync/route.ts`.
Källa för serverinställningar: Websupports kunskapsdatabas.

### Skicka svar via SMTP
Svar och uppföljningar skickas direkt via `smtp.websupport.se:465` när SMTP är
konfigurerat (använder IMAP-uppgifterna om inget separat anges). Utan
konfiguration registreras svaret lokalt (demoläge). Se `src/lib/mailer.ts` och
`src/app/api/mail/send/route.ts`.

> **Ny på Windows?** Följ den enkla steg-för-steg-guiden i **[SETUP.md](SETUP.md)**
> – dubbelklicka på `start.bat` så installeras och startas allt automatiskt.

## Steg 3 – koppla din riktiga Gmail (alternativ till IMAP)

Idag använder appen exempeldata från `src/lib/sample-data.ts`. För att läsa in
riktiga mejl från `jobb.ditec@gmail.com`:

1. Gå till <https://console.cloud.google.com/> → skapa ett projekt.
2. **Aktivera Gmail API** (APIs & Services → Library → Gmail API).
3. Skapa **OAuth-uppgifter** (OAuth client ID, typ "Web application") och lägg
   till `http://localhost:3000/api/gmail/callback` som redirect-URI.
4. Fyll i `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` och `GOOGLE_REDIRECT_URI` i
   `.env.local`.
5. Bygg ut med:
   - `/api/gmail/auth` och `/api/gmail/callback` för OAuth-inloggning.
   - En funktion som hämtar mejl (`users.messages.list` / `.get`) och kör varje
     mejl genom `/api/classify`.
   - Byt ut `generateLeads()` i `src/lib/store.tsx` mot de inlästa mejlen.

Läskoppling räcker för överblick och kategorisering. Vill du även **skicka**
uppföljningar direkt från appen behövs `gmail.send`-scope och ett anrop till
`users.messages.send` i "Markera som skickad"-knappen (`src/app/follow-up/page.tsx`).
Idag öppnas i stället ett förifyllt mejl i ditt vanliga e-postprogram via
"Öppna i e-postprogram".

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
