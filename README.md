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

### Kategorisering
Nya mejl kategoriseras automatiskt med regelbaserad nyckelordslogik (kategori,
prioritet, tjänst och en kort sammanfattning). Allt körs lokalt – ingen extern
AI-tjänst eller API-nyckel behövs. Se `src/lib/classifier.ts`.

### Fordonsuppgifter via regnummer
När ett mejl öppnas letar appen efter ett svenskt registreringsnummer i texten
och hämtar fordonsuppgifter (bilmärke, modell, årsmodell, färg, miltal och
längd). Du kan också skriva in ett regnummer manuellt, samt infoga bilinfon i
svaret med ett klick.

**Gratis (rekommenderas – ingen kostnad):**
1. **Ett-klicks-länkar** – i fordonsraden/panelen finns länkar till
   Transportstyrelsens gratis fordonsuppslag och biluppgifter.se. Klicka, läs
   uppgifterna och fyll i fälten i appen. Fungerar överallt, kostar inget.
2. **Automatisk gratis-scraper (valfritt, lokalt)** – appen kan hämta
   uppgifterna automatiskt från Transportstyrelsens gratistjänst med en riktig
   webbläsare:
   ```bash
   npm i -D playwright
   npx playwright install chromium
   ```
   Sätt sedan `VEHICLE_SCRAPE=transportstyrelsen` i `.env.local`. Kör lokalt
   (t.ex. Windows). Fungerar **inte** på Vercels serverless-funktioner, och kan
   ibland stoppas av reCAPTCHA – då används länkarna/fälten i stället.

**Betald leverantör (valfritt):** vill du ha ett riktigt API senare, sätt
`VEHICLE_API_URL` och `VEHICLE_API_KEY` (t.ex. Biluppgifter.se eller Car.info)
och justera `mapProviderResponse` i `src/app/api/vehicle/route.ts`.

**Obs:** miltal/mätarställning i registret är "senast kända vid besiktning",
inte realtid.

## Kom igång

```bash
npm install
npm run dev
```

Öppna http://localhost:3000

Appen fungerar direkt med exempeldata – ingen konfiguration behövs.

## Kategorisering

Kategoriseringen är regelbaserad och körs automatiskt – ingen konfiguration
eller API-nyckel behövs. Justera nyckelord och logik i `src/lib/classifier.ts`.

Testa fordonsuppslaget:
```bash
curl "http://localhost:3000/api/vehicle?regnr=JHK427"
```

## Koppla din brevlåda (info@ditecsisjon.se)

Leads (Eniro, offerter) kommer till `info@ditecsisjon.se` hos Websupport, så
appen kopplas dit via IMAP/SMTP – standardprotokoll, ingen OAuth krävs.

1. Kopiera `.env.example` till `.env.local` och fyll i lösenordet till brevlådan:
   ```
   IMAP_HOST=imap.websupport.se
   IMAP_PORT=993
   IMAP_SECURE=true
   IMAP_USER=info@ditecsisjon.se
   IMAP_PASSWORD=ditt-lösenord
   IMAP_MAILBOX=Offerter
   MAIL_FETCH_LIMIT=60

   SMTP_HOST=smtp.websupport.se
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_FROM=info@ditecsisjon.se
   ```
2. Starta om appen (`npm run dev`). Inkorgen hämtar de senaste mejlen automatiskt
   vid start; uppdatera manuellt med ↻-knappen bredvid filtermenyn.

Varje inkommet mejl körs genom kategoriseringen (offert/bokning/konsultation/
övrigt) och regnummer plockas automatiskt ur texten för fordonsuppslaget. Svar
och uppföljningar skickas via SMTP. Utan konfiguration körs appen i demoläge.

**Hantera brus:** en `info@`-adress får mycket annan post. Använd filtermenyn
uppe till vänster ("Affärer (dölj övrigt)") för att bara visa affärer. Vill du
filtrera redan i brevlådan – sortera leads till en mapp och sätt
`IMAP_MAILBOX=Offerter`, så läser appen bara den mappen.

**Säkerhet:** `.env.local` är gitignore:at – lösenordet hamnar aldrig i koden.
IMAP/SMTP sker på serversidan, så kör appen som en riktig server (inte statisk
sajt). Se `src/lib/mail.ts`, `src/lib/mailer.ts` och `src/app/api/mail/*`.

> **Ny på Windows?** Följ den enkla steg-för-steg-guiden i **[SETUP.md](SETUP.md)**
> – dubbelklicka på `start.bat` så installeras och startas allt automatiskt.

> **Vill du använda Gmail (offert.ditec@gmail.com) i stället?** Byt till
> `IMAP_HOST=imap.gmail.com` / `SMTP_HOST=smtp.gmail.com` och använd ett
> **app-lösenord** (<https://myaccount.google.com/apppasswords>, kräver 2-stegs-
> verifiering). Obs: då måste dina leads vidarebefordras till Gmail för att synas.

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
