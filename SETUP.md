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

## Steg 4 – Koppla din e-post (info@ditecsisjon.se)

När Anteckningar öppnas med filen `.env.local`, fyll i **ditt e-postlösenord**
på raden `IMAP_PASSWORD`. Exempel:

```
IMAP_USER=info@ditecsisjon.se
IMAP_PASSWORD=ditt-lösenord-här
```

Spara med **Ctrl + S** och stäng fönstret. Övriga rader är redan ifyllda för
Websupport (`imap.websupport.se` / `smtp.websupport.se`).

> **Viktigt:** lösenordet sparas bara lokalt på din dator i filen `.env.local`.
> Det skickas aldrig någon annanstans och hamnar aldrig i koden.

Om du redigerade `.env.local` efter att appen startade: stäng det svarta
fönstret och dubbelklicka på `start.bat` igen så laddas lösenordet in.

## Klart!

- **Läsa & kategorisera mejl:** appen hämtar de senaste mejlen automatiskt. Klicka
  på ↻ bredvid "Alla konversationer" för att uppdatera.
- **Svara:** skriv i rutan nere till höger och klicka **Skicka mejl** – svaret
  går ut via din Websupport-adress.
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
| Inga riktiga mejl syns (bara demo) | Kontrollera att `IMAP_PASSWORD` är ifyllt och sparat i `.env.local`, starta om. |
| "Kunde inte hämta mejl" | Dubbelkolla lösenordet och att adressen är `info@ditecsisjon.se`. |
| Webbläsaren visar inget | Vänta 10–20 sek efter start, ladda om sidan (F5). |

Behöver du hjälp? Hör av dig så löser vi det tillsammans.
