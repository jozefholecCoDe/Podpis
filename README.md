# Podpis dokumentu

Jednoduchá webová aplikácia na podpisovanie dokumentov:

1. Nahráte dokument (PDF, DOCX, DOC, ODT alebo RTF).
2. Kliknutím/ťahaním myšou vyznačíte na dokumente miesto, kam sa má vložiť podpis.
3. Zadáte email podpisujúceho — aplikácia mu pošle odkaz na podpísanie.
4. Podpisujúci otvorí odkaz, nakreslí podpis priamo do vyznačeného rámčeka a odošle.
5. Po podpísaní sa podpísaný PDF **automaticky odošle emailom späť** — ako príloha na
   adresu, ktorú ste zadali pri odosielaní (ak ju necháte prázdnu, použije sa adresa
   `SMTP_FROM`, teda tá, z ktorej žiadosť o podpis odišla).
6. Vy aj podpisujúci si môžete finálny podpísaný PDF navyše kedykoľvek stiahnuť.

Ak by odoslanie emailu s podpísaným dokumentom zlyhalo (napr. výpadok SMTP), podpis sa
tým nezruší — dokument zostáva podpísaný, chyba sa zobrazí na stránke dokumentu a PDF sa
dá stiahnuť.

Postavené na Next.js (App Router), `pdf-lib` (vkladanie podpisu do PDF), `pdfjs-dist`
(zobrazenie PDF v prehliadači) a `nodemailer` (odoslanie emailu).

## Požiadavky

- Node.js 20+
- **LibreOffice** nainštalovaný na serveri (príkaz `soffice` musí byť v `PATH`) — potrebné
  iba na konverziu DOCX/DOC/ODT/RTF na PDF. Ak nahrávate len PDF súbory, LibreOffice
  nie je potrebný.
  - Ubuntu/Debian: `apt-get install libreoffice-writer`
- SMTP účet na odosielanie emailov (napr. Gmail s "App Password", alebo iný mailserver).

## Nastavenie

1. Skopírujte `.env.example` do `.env.local` a vyplňte SMTP údaje:

   ```bash
   cp .env.example .env.local
   ```

2. Nainštalujte závislosti a spustite dev server:

   ```bash
   npm install
   npm run dev
   ```

3. Otvorte [http://localhost:3000](http://localhost:3000).

### Premenné prostredia

| Premenná        | Popis                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| `SMTP_HOST`      | Adresa SMTP servera (napr. `smtp.gmail.com`)                          |
| `SMTP_PORT`      | Port SMTP servera (zvyčajne `587`)                                    |
| `SMTP_USER`      | Prihlasovacie meno / email                                            |
| `SMTP_PASS`      | Heslo / App Password                                                  |
| `SMTP_SECURE`    | `true` pre port 465 (SSL), inak nechajte prázdne (STARTTLS na 587)     |
| `SMTP_FROM`      | Adresa odosielateľa v emaile (ak chýba, použije sa `SMTP_USER`). Zároveň je to predvolená adresa, na ktorú sa vráti podpísaný dokument. |
| `APP_BASE_URL`   | Verejná URL aplikácie použitá v odkaze na podpis (napr. `https://podpis.example.com`). Ak chýba, odvodí sa z požiadavky. |

### Gmail App Password

Ak chcete posielať cez Gmail, v účte Google zapnite dvojfaktorové overenie a v
[nastaveniach App Passwords](https://myaccount.google.com/apppasswords) vygenerujte
heslo pre aplikáciu. Použite ho ako `SMTP_PASS` s `SMTP_HOST=smtp.gmail.com`,
`SMTP_PORT=587`.

## Ako to funguje / obmedzenia

- Nahraté dokumenty a metadáta sa ukladajú lokálne do priečinka `data/` (jednoduchý
  JSON súbor + súbory na disku). Pre nasadenie potrebujete trvalý disk (VPS, Docker s
  volume) — na serverless platformách bez perzistentného súborového systému (napr.
  Vercel) táto jednoduchá implementácia nebude fungovať.
- Odkaz na podpis (`/sign/[token]`) nie je chránený heslom — kto odkaz pozná, môže
  dokument podpísať. Je určený na posielanie iba dôveryhodnému podpisujúcemu emailom.
  Pre produkčné nasadenie s prísnejšími nárokmi zvážte pridanie overenia (napr. PIN
  kód poslaný SMS/emailom).
- DOCX/DOC/ODT/RTF sa pri nahraní automaticky skonvertujú na PDF cez LibreOffice —
  ďalej sa pracuje už len s PDF verziou (podobne ako napr. DocuSign).

## Skripty

```bash
npm run dev     # vývojový server
npm run build   # produkčný build
npm start        # spustenie produkčného buildu
npm run lint    # ESLint
```
