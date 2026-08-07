# Ditec Inkorg – komplett projektbeskrivning (för Lovable)

Klistra in denna fil som projektbeskrivning i Lovable. Den beskriver hela
appen: syfte, design, datamodell, alla vyer, all affärslogik och alla
integrationer. Bygg gärna i milstolparna längst ner – en del i taget.

---

## 1. Vad appen är

En intern webbapp för **Ditec Sisjön** (bilvårdsföretag i Göteborg,
www.ditecsisjon.com) som samlar alla inkommande kundförfrågningar via e-post
(offertförfrågningar, bokningar, frågor) i en smart inkorg. Appen
kategoriserar mejlen automatiskt, hämtar biluppgifter från registreringsnummer,
föreslår färdiga svar, bevakar offerter som inte fått svar, och sköter
SMS-kampanjer för återbehandling av lackskydd.

Språk i hela appen: **svenska**. En enda användare (ägaren) – skyddas med ett
enkelt lösenord.

---

## 2. Design & övergripande layout

- Stil: ren, ljus, modern – vit bakgrund, ljusgrå paneler (slate-50/100),
  blå accentfärg (brand/primär ≈ #2563eb), rundade hörn (rounded-xl), tunna
  ramar (slate-200). Typsnitt: systemsans.
- **Ingen fast sidomeny.** I stället en **diskret flytande rund menyknapp**
  nere till vänster (blå cirkel med hamburgerikon). Klick öppnar en liten
  panel med länkar till alla vyer + "Logga ut". Menyn visas inte på
  inloggningssidan.
- Startvyn är **Inkorgen** (se nedan) – utformad som Wix Inbox:
  konversationslista till vänster, konversation + svarsruta till höger.

---

## 3. Datamodell

### Lead (ärende/konversation)
- id, from (kundnamn), email, phone?, subject, preview (120 tecken), body
  (hela mejltexten), receivedAt (ISO)
- channel: "email" | "webbformular" | "telefon"
- category: "offert" | "bokning" | "konsultation" | "ovrigt"
- status: "ny" | "obesvarad" | "besvarad" | "offert_skickad" | "bokad" | "ingen_affar"
- priority: "hog" | "medel" | "lag"
- service? (t.ex. "Helrekond"), regnr?, quoteSentAt?, quoteAmount?,
  lastContactAt?, followUpsSent (antal), aiSummary?, aiConfidence?, unread?
- vehicle? (sparade fordonsuppgifter, se VehicleData)

### Message (rad i konversationstråd)
- id, direction: "in" | "out", body, at (ISO), attachments? (filnamn)

### HistoryEntry (statushistorik per ärende)
- id, type: "ringt" | "sms" | "mejl" | "anteckning" | "status", text, at

### ReminderConfig (automatisk påminnelse per ärende)
- enabled, daysAfter (dagar efter offert/senaste kontakt), text (egen
  påminnelsetext), lastSentAt?

### VehicleData (sparade biluppgifter per ärende)
- regnr, brand?, model?, modelYear?, color?, mileageMil? (mil), lengthMm?

### Technician
- id, name, competences: string[] (nycklar, se kompetenslista)

### Recipient (SMS-kampanj, en kund/bil)
- id, name, phone, regnr, car (t.ex. "Volvo XC60"), sizeMm?, service,
  coating: "ceramic_light_plus" | "ceramic_ultra" | "ditec_original",
  lastTreatment (ISO), variant: "A" | "B",
  status: "ny" | "skickat" | "svarat", sentAt?, remindersSent,
  reply?: "ja" | "nej" | "fraga_pris" | "sald" | "fundering", replyAt?,
  autoReplySent?

**Ärendenyckel:** historik/påminnelser/fordon kopplas till ärendet via
`regnr || email || id` (stabilt även när mejl hämtas om).

Lagring: allt användardata sparas beständigt (databas). Kom ihåg-läge:
ändringar (status, historik, mallar, tekniker, kampanj) ska överleva
omstart/inloggning.

---

## 4. Kategorisering (regelbaserad – ingen extern AI)

Vid inläsning av ett mejl analyseras ämne + text med nyckelord:
- **offert** – "offert", "pris", "kostnad", "vad kostar", "prisförslag" …
- **bokning** – "boka", "bokning", "tid", "när kan ni", "ledig tid" …
- **konsultation** – frågor/rådgivning: "fråga", "undrar", "rekommenderar",
  "vad ska jag välja" …
- **ovrigt** – allt annat (fakturor, leverantörer, spam).

Sätt även: priority (hog om brådskande ord/stort värde), service (matcha
tjänstenamn: Helrekond, Rekonditionering, Lackskydd, Rostskydd, Invändig
rengöring, Polering, Strålkastarrenovering), en kort svensk sammanfattning
(aiSummary) och regnr (regex: 3 bokstäver + 3 siffror t.ex. ABC123, eller
3 bokstäver + 2 siffror + bokstav/siffra t.ex. ABC12D, mellanslag tillåtet).

Kategori-etiketter: offert="Offertförfrågan", bokning="Direktbokning",
konsultation="Konsultation", ovrigt="Övrigt".
Status-etiketter: ny="Ny", obesvarad="Obesvarad", besvarad="Besvarad",
offert_skickad="Offert skickad", bokad="Bokad", ingen_affar="Ingen affär".

---

## 5. Vy: Inkorg (startsida, Wix Inbox-stil)

**Överst: fordonsrad** över hela bredden – "Biluppgifter på vald offert." +
fält i rad: REGNR, BILMÄRKE (märke+modell), ÅRSMODELL, MÄTARSTÄLLNING (km),
FÄRG, LÄNGD (mm). Vid regnr visas även två länkar som öppnas i ny flik:
"Transportstyrelsen" → `https://fordon-fu-regnr.transportstyrelsen.se/?registreringsnummer={REGNR}`
och "biluppgifter.se" → `https://biluppgifter.se/fordon/{REGNR}`.
En liten badge visar datakälla ("demo" / "sparat").

**Vänster kolumn (ca 320 px): konversationslista**
- Sökfält: söker på regnr, kundnamn, e-postadress, ämne, text.
- Filter: "Affärer (dölj övrigt)" (standard) / visa alla. Räknare med antal.
- Varje rad: **avatar-cirkel med ärendets initialer** (inte kundens!):
  - OF = Offertförfrågan (ljusgul bakgrund), BT = Boka tid (grön),
    KO = Konsultation (ljuslila), ÖV = Övrigt (grå).
  - När **kunden har svarat** på vårt senaste utskick (eller status är
    bokad/ingen affär): mörkare nyans + **svart ring** runt cirkeln.
  - Kundnamn (fet om oläst), ärendetyp ("offert förfrågan", "boka tid",
    "fråga / konsultation"), tjänst, datum, blå oläst-prick/räknare.
- Olästa markeras med blå markering. Aktiv rad har ljusblå bakgrund.

**Höger yta (resten av bredden, full bredd):**
- Konversationshuvud: avatar, kundnamn, e-post + ikonrad med verktyg:
  - Historik (statushistorik: logga "Ringt upp", "SMS", "Mejl",
    "Anteckning" med fritext; visa tidslinje)
  - Priskonfigurator (dold ikon – se §7)
  - Tillgänglighetskoll (dold ikon – se §8)
  - Påminnelse (ställ in automatisk påminnelse: på/av, dagar, egen text)
  - Markera hanterad (manuell toggle), Markera oläst, arkiv/stjärna
- Konversationstråd: kundens mejl som kort (avsändare + text + tid),
  våra svar högerställda/markerade.
- **Svarsruta längst ner**: "Meddela via: E-post", Till: (kundens adress),
  ämnesrad (förifylld "Re: …"), textarea, bifoga filer (gem-ikon, chips med
  borttagning), emoji-knapp, plus-knapp samt:
  - **"Förslag"-knapp** (trollspö-ikon): fyller textarean med rätt svarsmall
    (se §9) där platshållare ersatts med kundens namn, tjänst och bildata.
  - **Skicka mejl**-knapp: skickar via SMTP (eller markerar som skickat i
    demoläge), loggar i historiken, sätter status besvarad, rensar oläst.

**Fordonspanel-beteende:** när ett mejl öppnas och regnr hittas hämtas
biluppgifter automatiskt (demo-läge: deterministisk exempeldata per regnr).
Fälten (märke, modell, årsmodell, färg, miltal, längd) är **redigerbara** och
kan **sparas på ärendet** ("Spara på ärendet"-knapp + "Infoga i svaret" som
lägger en rad "Fordon: Volvo XC60 (2020), Silvermetallic, reg.nr ABC123." i
svarsrutan).

---

## 6. Vy: Översikt, Pipeline, Uppföljningar

**Översikt (dashboard):** nyckeltal-kort (nya/obesvarade, skickade offerter,
bokade, svarstid), fördelning per kategori, senaste ärenden.

**Pipeline (kanban):** kolumner i ordningen Ny → Obesvarad → Besvarad →
Offert skickad → Bokad → Ingen affär. Kort med kundnamn, tjänst, belopp.
Status ändras via knappar/drag.

**Uppföljningar:** offerter med status "offert_skickad" utan kundsvar flaggas
enligt kadensen **3, 7, 14, 30 dagar** efter offertdatum (sista är ett artigt
avslutsmejl). Visa: kund, dagar sedan offert, steg (1–4), färdigskrivet
uppföljningsmejl (redigerbart) och "Skicka"-knapp som räknar upp
followUpsSent. Motivering i UI: "80 % av affärer kräver 5+ uppföljningar".

---

## 7. Priskonfigurator (dold ikon i konversationshuvudet)

Bilstorlek härleds från fordonets längd:
- < 4300 mm = "Liten bil" (t.ex. VW Polo)
- 4300–4749 mm = "Mellanstor bil" (t.ex. VW Golf, Volvo V40)
- 4750–5049 mm = "Stor bil / SUV" (t.ex. Volvo XC60/V90, Audi A6)
- ≥ 5050 mm = "Extra stor / Transportbil" (t.ex. XC90, Sprinter)

Storleken förväljs från bilens längd men kan ändras manuellt. Behandlingar
med pris per storlek (liten/mellan/stor/XL, SEK) – redigerbara i koden:

| Behandling | Liten | Mellan | Stor | XL |
|---|---|---|---|---|
| Helrekond (in- och utvändigt) | 2500 | 3200 | 3900 | 4600 |
| Utvändig rekond | 1500 | 1900 | 2300 | 2700 |
| Invändig rengöring | 1200 | 1500 | 1800 | 2100 |
| Keramiskt lackskydd | 4000 | 4900 | 5900 | 6900 |
| Rostskyddsbehandling | 3500 | 4200 | 4900 | 5600 |
| Polering / lackrenovering | 1800 | 2200 | 2600 | 3000 |
| Strålkastarrenovering (fast) | 900 | 900 | 900 | 900 |

Behandlingar som matchar kundens mejl (nyckelord) förbockas automatiskt;
om inget matchar och det är offert/konsultation förbockas Helrekond.
Summa visas, och en knapp "Infoga i svaret" lägger prisförslaget som text i
svarsrutan.

---

## 8. Verkstadsplanerare & tillgänglighet

**Modell:** arbetsdagar mån–fre med tre pass: 08–11, 11–14, 14–17. En tid är
ledig om minst en tekniker **med rätt kompetens** är ledig i passet.

**Kompetenser** (nyckel → etikett): helrekond=Helrekond,
rekond=Rekonditionering, lackskydd=Lackskydd, rostskydd=Rostskydd,
invandig=Invändig rengöring, polering=Polering,
stralkastare=Strålkastarrenovering.

Tjänst → kompetens: "rost…"→rostskydd, "lackskydd/keramisk"→lackskydd,
"polering"→polering, "strålkastare"→stralkastare, "invändig/rengöring"→
invandig, "helrekond"→helrekond, annars rekond.

**Demotekniker (startdata, redigerbara):** Anders (rekond, helrekond,
invändig, polering, strålkastare), Bea (lackskydd, polering, rekond,
helrekond), Ciro (rostskydd, rekond, helrekond). Demo-schemat genereras
deterministiskt (samma dag+tekniker ⇒ samma beläggning).

**Vy "Verkstad":** nyckeltal (antal tekniker, beläggning % denna vecka,
lediga/bokade pass), kort per tekniker med kompetens-chips,
kompetenstäckning (antal tekniker per kompetens), veckoschema-tabell
(tekniker × dagar, "bokade/3" med färg: grönt=ledigt, blått/gult=delvis,
rött=fullt, tooltip med passdetaljer) samt **"Redigera tekniker"**: lägg
till/ta bort tekniker, byt namn, klicka i/ur kompetenser, spara.

**Tillgänglighetskoll i Inkorgen (dold ikon):** appen försöker tolka önskad
tid ur kundens mejl (t.ex. "tisdag förmiddag"); annars väljs tid manuellt
(datum+pass). Svar: "Ledigt – tekniker X kan ta emot [dag] [pass]" eller
"Upptaget" + **två alternativa tider** (nästkommande lediga pass med rätt
kompetens) och en knapp som infogar förslaget som färdig svarstext.

---

## 9. Svarsmallar (egen vy)

Redigerbara mallar per **ärendetyp** (offert, bokning, konsultation, övrigt)
och per **tjänst** (Helrekond, Rekonditionering, Lackskydd, Rostskydd,
Invändig rengöring, Polering, Strålkastarrenovering). Mallval: tjänst-mall
först, annars ärendetyp-mall, annars standardmall.

Platshållare: {fornamn}, {tjanst}, {regnr}, {bilmarke}, {arsmodell}, {farg},
{signatur}. Signatur: "Vänliga hälsningar,\nDitec Sisjön\nwww.ditecsisjon.com".

Standardmall offert (exempel på ton – skapa liknande för övriga):
"Hej {fornamn}! Tack för din förfrågan om {tjanst}. … Du är välkommen att
köra förbi för en snabb bedömning, eller svara med några bilder så
återkommer vi med en offert. … {signatur}"

Standard-påminnelsetext: "Hej {fornamn}! Jag ville bara höra av mig och
kontrollera att du fått vår offert för {tjanst}. …"

---

## 10. Vy: SMS-kampanj (återbehandling av lackskydd)

Månadslista över kunder vars lackskydd behöver återbehandlas.

**Två återbehandlingstyper:**
- **Ceramic underhåll** – för bilar med Ditec Ceramic Light+ eller Ultra.
  Görs efter **12 månader**. Innehåll: tvätt, dekontaminering, ny keramisk
  booster.
- **Topcoat** – för bilar med Ditec Original. Görs efter **18 månader**.
  Innehåll: tvätt, dekontaminering, ny Topcoat-försegling.

Priser per storlek (redigerbara i inställningarna):
Ceramic underhåll 1495/1795/1995/2495 kr, Topcoat 1295/1495/1795/2195 kr
(liten/mellan/stor/XL). "Dags"-flagga när intervallet passerats sedan
lastTreatment.

**A/B-test:** två redigerbara SMS-varianter (A/B) med platshållare
{fornamn}, {bil}, {behandling}. Mottagare fördelas växelvis. Statistik per
variant: skickade, svar, bokningar, konvertering % + "vinnare"-markering.

**Utskick & påminnelser:** knapp per rad ("Skicka SMS"), status ny→skickat.
Vid uteblivet svar efter X dagar (standard 4) föreslås påminnelse, max 2 st.

**Svarshantering:** inkommande SMS tolkas automatiskt till:
ja ("Vill boka"), nej ("Nej tack"), fraga_pris ("Frågar pris"),
sald ("Bilen såld" – nyckelord: sålt, bytt bil, ny bil…),
fundering (övrigt). Manuell override via dropdown + fält "Klistra in
kundens SMS" som tolkar texten.

**Automatiska svar** (genereras utifrån svarstyp, behandlingstyp och
bilstorlek):
- ja → tack + två konkreta tidsförslag från planeraren (lackskydd-kompetens)
- fraga_pris → pris för rätt behandling + storlek + vad som ingår
- sald → grattis + erbjud **nytt lackskydd med 20 % rabatt** (rabatten
  redigerbar) på den nya bilen
- nej → vänligt tack, välkommen åter
- fundering → förklara vad återbehandlingen gör, vad som ingår + mjuk CTA
Auto-svar visas i tabellen och markeras autoReplySent.

**Import:** knapp "Importera DOBS-lista" (hämtar från API om konfigurerat,
annars demolista) och **"Importera fil (CSV)"** – tolkar kolumner namn,
telefon, regnr, bil, behandling/coating (fritext mappas till de tre
coating-typerna), datum senaste behandling.

**Översikt:** kort med totalsiffror (mottagare, skickade, svar, bokningar)
+ inställningspanel (varianttexter, påminnelsedagar, max påminnelser,
auto-pris på/av, rabatt %, prisgrid för båda behandlingstyperna).

---

## 11. Inloggning

Enkel lösenordssida (ett gemensamt lösenord, lagras säkert som secret).
Utan giltig session omdirigeras allt till /login. "Logga ut" i menyn.
Undantag: SMS-webhookens endpoint är publik.

---

## 12. Integrationer (bygg som utbytbara adapters med demoläge)

Alla externa kopplingar ska ha **demoläge som fallback** så appen alltid
fungerar och kan demonstreras utan nycklar.

1. **E-post in (IMAP)** – Websupport: imap.websupport.se:993 (SSL), konto
   info@ditecsisjon.se, läser mappen **"Offerter"** (leads är redan
   filtrerade dit). Hämta senaste ~60, tolka avsändare/ämne/text/datum,
   kategorisera enligt §4. Oläst-flagga från \Seen.
2. **E-post ut (SMTP)** – smtp.websupport.se:465 (SSL), samma konto.
3. **SMS (46elks)** – skicka SMS (Basic auth användarnamn/lösenord,
   avsändare "Ditec"), samt webhook för inkommande SMS → matcha kund på
   telefonnummer (normalisera: strippa +46/0/mellanslag) → klassificera →
   skicka auto-svar → uppdatera status.
4. **Fordonsuppgifter** – demoläge + gratis ett-klicks-länkar (§5). Valfritt
   API senare.
5. **DOBS** – CSV-import (primär väg) eller API-URL om den finns.

*Not för Lovable:* IMAP kräver rå TCP och kan vara svårt i vissa
serverless-miljöer – bygg mejlhämtningen som en separat backend-funktion
(edge function/server) och låt appen fungera fullt ut i demoläge tills den
kopplas.

---

## 13. Demodata

Appen ska starta med realistisk svensk demodata: ca 12 ärenden (blandade
kategorier/statusar, några med regnr som JHK427 Volvo XC60, MRT881 VW
Transporter…), konversationstrådar, samt en demolista för SMS-kampanjen
(kunder med olika coating och behandlingsdatum). All demodata på svenska,
bilvårds-kontext.

---

## 14. Föreslagen byggordning (milstolpar)

1. Grund: layout, flytande meny, inloggning, datamodell + demodata.
2. Inkorgen: lista + tråd + svarsruta + sök/filter + avatar-logik +
   oläst/hanterad.
3. Fordonsrad + fordonspanel (demo + länkar + spara).
4. Kategorisering + Översikt + Pipeline + Uppföljningar (kadens 3/7/14/30).
5. Svarsmallar + Förslag-knapp + påminnelser + historik.
6. Priskonfigurator + Verkstad (tekniker, schema, tillgänglighetskoll).
7. SMS-kampanj (lista, A/B, auto-svar, CSV-import, inställningar).
8. Riktiga integrationer: IMAP/SMTP, 46elks-webhook.
