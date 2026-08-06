# Glansverk – landningssida

Landningssida för AI-plattformen för bilvårdsföretag: nio moduler för försäljning,
planering, drift, personal och marknadsföring – med demobokning som huvudmål.

> **Obs:** "Glansverk" är ett arbetsnamn. Sök och ersätt `Glansverk`/`GLANSVERK` i
> `index.html` (och `<title>`/beskrivningen i `<head>`) när ni bestämt riktigt namn.

## Struktur

```
index.html          – hela sidan (all text redigeras här)
css/styles.css      – design (färger/typsnitt i :root-tokens högst upp)
js/main.js          – meny, scrollanimationer, video, demoformulär
assets/fonts/       – självhostade typsnitt (Barlow, OFL-licens – ingen Google-koppling)
```

Sidan är helt statisk – inga byggsteg, inga beroenden. Öppna `index.html` i en
webbläsare lokalt, eller publicera enligt nedan.

## Publicera

**GitHub Pages (gratis):** Settings → Pages → "Deploy from a branch" → välj `main`
och `/ (root)`. Sidan hamnar på `https://<användare>.github.io/<repo>/`.
Egen domän (t.ex. `glansverk.se`) kopplas under samma inställning.

**Netlify/Vercel (gratis):** Importera repot, inga inställningar behövs.

## Anpassa

| Vad | Var |
| --- | --- |
| Presentationsvideo | `index.html`, sök `VIDEO:` – sätt `data-youtube-id` eller `data-vimeo-id` |
| Demoformulärets mottagare | `js/main.js`, sök `mailto:` (idag `jobb.ditec@gmail.com`) |
| Ta emot formulär utan mejlprogram | Skapa gratisformulär på formspree.io, se kommentar `FORMULÄR:` i `index.html` – eller ersätt formuläret med en Calendly-inbäddning |
| Färger & typsnitt | `css/styles.css`, tokens under `:root` (accenten heter `--red`) |
| Siffror i mockupen/sifferremsan | `index.html` – exempeldata, byt gärna till era riktiga siffror |
| Delningsbild för sociala medier | Lägg till `<meta property="og:image" ...>` i `<head>` |

## Att göra innan lansering

- [ ] Bestäm produktnamn och byt ut arbetsnamnet
- [ ] Lägg in riktig presentationsvideo
- [ ] Koppla formuläret till Formspree eller Calendly
- [ ] Byt exempelsiffror mot riktiga resultat/referenser när de finns
- [ ] Verifiera GDPR-texten mot er faktiska datahantering
- [ ] Koppla egen domän
