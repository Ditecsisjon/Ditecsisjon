# Lägg appen på ditt Hetzner-webbhotell – steg för steg

Du har redan webbhotell hos Hetzner – då kan appen köras där med din egen
domän. Hetzners webbhotell har inbyggt Node.js-stöd (krävs för appen).

> **Krav:** Node.js-stödet finns i paketet **Webhosting L** och uppåt, samt på
> Managed Server. Logga in på **konsoleH** (https://konsoleh.hetzner.com), välj
> din domän och leta efter **Services → Node.js configuration** i vänstermenyn.
> Ser du den menyn är du redo. Ser du den inte har du ett mindre paket – då är
> gratis Vercel (se `DEPLOY.md`) enklaste vägen i stället.

Fördelar jämfört med Vercel:
- Tekniker och kampanjstatus sparas **permanent** på hotellets disk
  (på Vercel kan de nollställas vid viloläge).
- Egen domän, t.ex. `app.ditecsisjon.se` eller den domän du har hos Hetzner.
- Ingen extra tjänst – allt hos en leverantör du redan betalar.

## Steg 1 – Ladda upp koden

**Alternativ A (enklast): SFTP**
1. Ladda ner projektet som ZIP (be Claude om en färsk ZIP, eller hämta från
   GitHub: repot → gröna **Code**-knappen → **Download ZIP** på grenen
   `claude/email-inbox-app-s9ej7t`).
2. Packa upp ZIP:en på din dator.
3. Anslut med ett SFTP-program (t.ex. FileZilla) till ditt webbhotell.
   Uppgifterna (host/användare/lösenord) finns i konsoleH under **Access
   details**.
4. Ladda upp hela projektmappen till t.ex. `ditec-app/` i ditt hemkatalog.
   (Hoppa över `node_modules/` och `.next/` om de finns – de byggs på servern.)

**Alternativ B: Git via SSH** (om du är bekväm med terminal)
```bash
ssh dittanvändarnamn@dittwebbhotell.hetzner.se
git clone -b claude/email-inbox-app-s9ej7t https://github.com/Ditecsisjon/Ditecsisjon.git ditec-app
```

## Steg 2 – Installera och bygg (via SSH)

SSH-åtkomst ingår i paket med Node.js-stöd. Anslut och kör:

```bash
cd ditec-app
npm install
npm run build
```

Detta tar några minuter första gången.

## Steg 3 – Skapa .env.local på servern

Skapa filen `ditec-app/.env.local` (via SFTP eller SSH: `nano .env.local`)
med dina uppgifter – **skriv aldrig lösenorden någon annanstans än här**:

```
APP_PASSWORD=ett-eget-lösenord-du-väljer

IMAP_HOST=imap.websupport.se
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=info@ditecsisjon.se
IMAP_PASSWORD=lösenordet-till-info@-brevlådan
IMAP_MAILBOX=Offerter
MAIL_FETCH_LIMIT=60

SMTP_HOST=smtp.websupport.se
SMTP_PORT=465
SMTP_SECURE=true
SMTP_FROM=info@ditecsisjon.se
```

`APP_PASSWORD` gör att sidan kräver inloggning – viktigt nu när den ligger på
internet.

## Steg 4 – Aktivera Node.js i konsoleH

1. Logga in på **konsoleH** → välj din domän.
2. Vänstermenyn: **Services → Node.js configuration**.
3. Fyll i formuläret:

| Fält | Värde |
|------|-------|
| Script path | `node_modules/.bin/next` |
| Argument | `start` |
| Working directory | `ditec-app/` (mappen du laddade upp till) |
| Log path | `ditec-app/log.txt` |
| Memory limit | `1024 MB` |
| Version | `22` (eller `24`) |

4. Klicka **Enable**.

Nu startar appen och din domän visar den. Öppna domänen i webbläsaren →
logga in med ditt `APP_PASSWORD` → **Meny → Mejlkoppling → Testa koppling**.
Grönt = klart! Dina offertförfrågningar från Offerter-mappen dyker upp i
Inkorgen.

## Vill du ha appen på en underadress, t.ex. app.ditecsisjon.se?

Skapa subdomänen där din domän hanteras och peka den mot webbhotellet
(konsoleH: lägg till subdomän under domänen). Koppla sedan Node.js-appen till
subdomänen på samma sätt som ovan.

## Uppdatera appen senare

När koden förbättrats:

```bash
cd ditec-app
git pull           # (Git-vägen) eller ladda upp nya filer via SFTP
npm install
npm run build
```

Starta sedan om appen i konsoleH (**Node.js configuration → Disable →
Enable**, eller Restart om knappen finns).

## Automatiska SMS-svar (när du kopplar 46elks)

Appen är nåbar från internet, så webhooken fungerar direkt:
1. Lägg `SMS_API_USERNAME`, `SMS_API_PASSWORD`, `SMS_FROM` i `.env.local`.
2. Hos 46elks: sätt SMS-callback till `https://din-domän/api/sms/inbound`.
3. Öppna kampanjvyn en gång så speglas listan till servern.

## Bra att veta

- **Fordons-scrapern** (`VEHICLE_SCRAPE=transportstyrelsen`) fungerar troligen
  **inte** på webbhotellet (Playwright behöver systembibliotek som inte finns
  där). Ett-klicks-länkarna till Transportstyrelsen/biluppgifter.se fungerar
  som vanligt.
- **Loggfilen** `ditec-app/log.txt` visar fel om något strular – bra första
  ställe att titta.
- **Efter serveromstart** hos Hetzner startar appen normalt om automatiskt via
  Node.js-tjänsten i konsoleH.
