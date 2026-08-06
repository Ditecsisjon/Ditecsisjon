# Lägg appen på en webbadress (Vercel) – steg för steg

> **Har du redan webbhotell hos Hetzner?** Då kan appen köras där i stället –
> se `DEPLOY-HETZNER.md`. Kräver paketet Webhosting L eller större (Node.js-
> stöd). Fördel: datan sparas permanent och du använder din egen domän.

Efter det här har du en egen adress (t.ex. `https://ditec-inkorg.vercel.app`)
som du kan öppna från dator och mobil. Du behöver aldrig ladda ner något igen –
varje gång koden uppdateras uppdateras sidan automatiskt. Appen skyddas med ett
lösenord så att bara du kommer in.

> Kräver ett gratis konto hos Vercel och att GitHub-repot är kopplat.

## Steg 1 – Skapa konto
1. Gå till **https://vercel.com** och klicka **Sign Up**.
2. Välj **Continue with GitHub** och logga in med samma GitHub-konto som har koden.

## Steg 2 – Importera projektet
1. På Vercel: klicka **Add New… → Project**.
2. Hitta repot **Ditecsisjon/Ditecsisjon** i listan → klicka **Import**.
3. Klicka **inte** Deploy än – gör steg 3 först (miljövariabler).

> **Viktigt om gren:** koden ligger på grenen
> `claude/email-inbox-app-s9ej7t`, inte på `main`. Efter första importen:
> gå till **Settings → Git → Production Branch**, skriv
> `claude/email-inbox-app-s9ej7t` och spara. Klicka sedan
> **Deployments → Redeploy**. Då byggs rätt kod, och varje framtida ändring på
> den grenen uppdaterar sidan automatiskt.

## Steg 3 – Fyll i inställningar (Environment Variables)
Under **Environment Variables**, lägg till följande (Name → Value):

| Name | Value |
|------|-------|
| `APP_PASSWORD` | ett eget lösenord du väljer (för att logga in i appen) |
| `IMAP_HOST` | `imap.websupport.se` |
| `IMAP_PORT` | `993` |
| `IMAP_SECURE` | `true` |
| `IMAP_USER` | `info@ditecsisjon.se` |
| `IMAP_PASSWORD` | lösenordet till info@-brevlådan |
| `IMAP_MAILBOX` | `Offerter` (eller `INBOX`) |
| `SMTP_HOST` | `smtp.websupport.se` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_FROM` | `info@ditecsisjon.se` |

(Vill du använda Gmail istället: `imap.gmail.com` / `smtp.gmail.com` och ett
app-lösenord.)

## Steg 4 – Deploya
1. Klicka **Deploy**. Vänta någon minut.
2. När det är klart får du en adress, t.ex. `https://ditecsisjon.vercel.app`.
3. Öppna adressen → skriv in ditt `APP_PASSWORD` → du är inne!

## Framtida uppdateringar
När appen förbättras uppdateras webbadressen **automatiskt** (Vercel bygger om
vid varje ändring i repot). Du behöver inte göra något.

## Automatiska SMS-svar (inkommande)

För att kundernas SMS-svar ska tolkas och besvaras automatiskt:
1. Koppla en SMS-tjänst (46elks) via `SMS_API_USERNAME` / `SMS_API_PASSWORD` / `SMS_FROM`.
2. Ange webhook-URL hos SMS-tjänsten (46elks: "SMS callback"):
   `https://din-app-adress/api/sms/inbound`
3. Öppna kampanjvyn en gång så speglas listan till servern (krävs för matchning).

Då tolkas inkommande svar automatiskt (ja / nej / frågar pris / bilen såld /
fundering) och rätt auto-svar skickas. Klicka **Uppdatera** i kampanjvyn för att
se de inkomna svaren. (Kräver att appen är nåbar från internet – dvs hostad.)

## Bra att veta
- **Säkerhet:** appen är låst med ditt `APP_PASSWORD`. Dela inte adressen +
  lösenordet med obehöriga. Lösenorden ligger som miljövariabler hos Vercel,
  aldrig i koden.
- **Automatiska påminnelser:** dessa skickas medan appen är öppen i en flik. För
  utskick dygnet runt (även när ingen har appen öppen) kan vi lägga till ett
  schemalagt jobb senare – säg till om du vill det.
- **Byta lösenord:** ändra `APP_PASSWORD` i Vercels inställningar (Settings →
  Environment Variables) och deploya om.
