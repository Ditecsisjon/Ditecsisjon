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
| **Översikt** | Nyckeltal (obesvarade, offerter i pipeline, uppföljningar att göra, bokade), "att hantera"-lista och fördelning per kategori. |
| **Inkorg** | Alla mejl i en lista med färgkodad kategori + status. Sök och filtrera på kategori/status. Klicka för att läsa, svara och ändra status. |
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
  -d '{"subject":"Offert flyttstädning","body":"Vad kostar flyttstädning av en 3:a?"}'
```

## Steg 3 – koppla din riktiga Gmail (nästa utbyggnad)

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
│   ├── page.tsx            Översikt / dashboard
│   ├── inbox/page.tsx      Inkorg med filter
│   ├── pipeline/page.tsx   Kanban-pipeline
│   ├── follow-up/page.tsx  Uppföljningsförslag
│   └── api/classify/       AI-kategorisering (med regel-fallback)
├── components/             UI-komponenter (badges, rader, detaljvy m.m.)
└── lib/
    ├── types.ts            Datamodell
    ├── sample-data.ts      Exempeldata (byts mot Gmail i steg 3)
    ├── classifier.ts       Regelbaserad kategorisering
    ├── follow-up.ts        Uppföljningslogik + mallar
    └── store.tsx           State-hantering
```
