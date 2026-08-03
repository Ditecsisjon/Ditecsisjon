# Kom igång på Windows – steg för steg

Den här guiden är skriven för dig som inte är van vid programmering. Följ
punkterna i ordning så är du igång på ca 10 minuter.

## Steg 1 – Installera Node.js (en gång)

1. Gå till **https://nodejs.org**
2. Klicka på den stora gröna knappen som säger **LTS** (rekommenderad version).
3. Öppna filen som laddas ner och klicka **Next → Next → Install** (standardval
   är bra). Klart.

> Node.js är "motorn" som kör appen. Du behöver bara installera den en gång.

## Steg 2 – Ladda ner appen

**Alternativ A (enklast):**
1. Gå till projektet på GitHub.
2. Klicka på den gröna **Code**-knappen → **Download ZIP**.
3. Högerklicka på den nedladdade ZIP-filen → **Extrahera alla…** → välj t.ex.
   Skrivbordet. Nu finns en mapp som heter `Ditecsisjon`.

**Alternativ B (om du har Git):** `git clone` av repot.

## Steg 3 – Starta appen

1. Öppna mappen `Ditecsisjon`.
2. Dubbelklicka på filen **`start.bat`**.
   - Första gången installeras appen automatiskt (kan ta några minuter – vänta).
   - En fil för inställningar öppnas i Anteckningar (se steg 4).
3. När appen startat öppnas din webbläsare på **http://localhost:3000**.

> Om Windows visar en varning ("Windows SmartScreen"): klicka **Mer info → Kör
> ändå**. Filen är ditt eget startskript, inget skadligt.

## Steg 4 – Koppla din Gmail (offert.ditec@gmail.com)

Gmail kräver ett särskilt **app-lösenord** (16 tecken) för appar som denna –
inte ditt vanliga Gmail-lösenord. Så här skapar du det (en gång):

**4a. Slå på 2-stegsverifiering** (om det inte redan är på)
1. Gå till **https://myaccount.google.com/security**
2. Under "Så här loggar du in på Google" → klicka **2-stegsverifiering** och följ
   stegen (du kopplar ditt mobilnummer). Utan detta går det inte att skapa
   app-lösenord.

**4b. Skapa app-lösenordet**
1. Gå till **https://myaccount.google.com/apppasswords**
2. Skriv ett namn du känner igen, t.ex. `Ditec Inkorg`, och klicka **Skapa**.
3. Google visar ett **16-teckens lösenord** (fyra grupper om fyra). Kopiera det.

**4c. Klistra in i appen**
När Anteckningar öppnas med filen `.env.local`, fyll i app-lösenordet på raden
`IMAP_PASSWORD` (mellanslagen spelar ingen roll, du kan ta bort dem):

```
IMAP_USER=offert.ditec@gmail.com
IMAP_PASSWORD=abcd efgh ijkl mnop
```

Spara med **Ctrl + S** och stäng fönstret. Övriga rader är redan ifyllda för
Gmail (`imap.gmail.com` / `smtp.gmail.com`). Samma app-lösenord används både
för att hämta och skicka mejl.

> **Viktigt:** app-lösenordet sparas bara lokalt på din dator i filen
> `.env.local`. Det skickas aldrig någon annanstans och hamnar aldrig i koden.
> Du kan när som helst återkalla det på apppasswords-sidan.
>
> IMAP är påslaget som standard i Gmail sedan 2025 – du behöver oftast inte
> ändra något i Gmails inställningar.

Om du redigerade `.env.local` efter att appen startade: stäng det svarta
fönstret och dubbelklicka på `start.bat` igen så laddas lösenordet in.

## Klart!

- **Läsa & kategorisera mejl:** appen hämtar de senaste mejlen automatiskt. Klicka
  på ↻ bredvid "Alla konversationer" för att uppdatera.
- **Svara:** skriv i rutan nere till höger och klicka **Skicka mejl** – svaret
  går ut via din Gmail-adress.
- **Uppföljningar:** öppna menyn (blå knapp nere till vänster) → **Uppföljningar**
  för att skicka påminnelser på offerter utan svar.

## Att stänga / starta igen

- **Stänga:** stäng det svarta fönstret (kommandotolken).
- **Starta igen:** dubbelklicka på `start.bat`. Appen körs bara medan det svarta
  fönstret är öppet.

## Om något strular

| Problem | Lösning |
|--------|---------|
| "Node.js saknas" | Gör steg 1 igen och starta om `start.bat`. |
| Inga riktiga mejl syns (bara demo) | Kontrollera att `IMAP_PASSWORD` (app-lösenordet) är ifyllt och sparat i `.env.local`, starta om. |
| "Kunde inte hämta mejl" / inloggning nekas | Använd **app-lösenordet** (16 tecken), inte ditt vanliga Gmail-lösenord. Kontrollera att 2-stegsverifiering är på och att adressen är `offert.ditec@gmail.com`. |
| "Application-specific password required" | Du använde vanliga lösenordet – skapa ett app-lösenord (steg 4b) och klistra in det. |
| Webbläsaren visar inget | Vänta 10–20 sek efter start, ladda om sidan (F5). |

Behöver du hjälp? Hör av dig så löser vi det tillsammans.
