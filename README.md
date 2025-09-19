# LexiDeck – učení slovíček z Excelu (offline‑first PWA)

Jednoduchá prohlížečová aplikace (vanilla JS + Vite, bez backendu). Načte `.xlsx`, vyberete list a trénujete kartičky se SRS (Leitner 1–5). Funguje offline a lze ji nainstalovat jako aplikaci.

## Rychlý start

- Požadavky: Node 18+
- Instalace: `npm i`
- Dev: `npm run dev` (výchozí port 5173; lze změnit např. `npm run dev -- --port 5175`)
- Build: `npm run build`
- Preview: `npm run preview`

## Použití (UI)

1) Nahrát `.xlsx` (nebo kliknout „Načíst sample.xlsx“)
- Nahoře vyberte list (sheet). App umí vybrat „stage 11“, pokud existuje.
- Kartička: předek = anglické slovo + „▶︎ Výslovnost“, zadek = překlad + odkaz na Google Translate.

2) Ovládání
- Mezerník = otočit kartu
- `1` = Věděl jsem, `2` = Nevěděl (nejdřív se karta otočí zpět, až pak přijde další slovo)
- `P` = přehrát výslovnost (bez flipu)

## SRS – Leitner (5 boxů)

- Start v boxu 1; správně ➜ +1 box (max 5), špatně ➜ box 1.
- Intervaly „due“: 1: ihned, 2: 10 min, 3: 1 hod, 4: 1 den, 5: 3 dny.
- Výběr další: preferuje „due“ položky; když nejsou, vybírá z nejnižšího dostupného boxu.

## Excel parsing

- Čtení v prohlížeči přes SheetJS (CDN).
- Sloupce (case‑insensitive aliasy):
  - `english` (alias `word`, `en`)
  - `translation` (alias `cz`, `cs`, `czech`, `česky`)
  - `pronunciationUrl` (alias `pronunciation`, `url`, `audio`)
- Pokud chybí hlavička, použije se fallback: sloupec 1 = english, 2 = translation, 3 = pronunciationUrl. První řádek bez (english/translation) se ignoruje jako šum.

## Výslovnost

- App se pokusí přehrát audio z `pronunciationUrl` přímo (mp3/wav/ogg, gstatic apod.).
- Pokud to není přímý audio soubor (např. Google Translate odkaz), použije se Web Speech API (`speechSynthesis`, en‑US) a přečte se slovo.

## Persistování pokroku

- localStorage klíč: `vocabProgress:<sheetName>`
- Položka (Card): `{ id, english, translation, pronunciationUrl, box, lastReviewedAt, correctCount, wrongCount, dueAt }`
- Merge podle `english` (case‑insensitive); nové položky startují v boxu 1.

## Offline a instalace (PWA)

- Service Worker na `/sw.js` (root scope), manifest `/manifest.webmanifest`.
- Cache-first pro statické soubory, stale‑while‑revalidate pro `.xlsx`.
- Instalace na desktopu: `localhost` funguje rovnou. Na LAN (HTTP) je nutné v Chrome (dočasně) povolit flag „Insecure origins treated as secure“ a přidat `http://<IP>:<port>`; lepší je HTTPS s důvěryhodným certifikátem (viz níže).

### HTTPS pro mobil (doporučeno)

1) Windows PowerShell (admin): `powershell -ExecutionPolicy Bypass -File scripts/setup-https.ps1 <VAŠE_IP>`
2) Spusťte: `npm run dev` (HTTPS se aktivuje automaticky z `cert/`)
3) Otevřete: `https://<VAŠE_IP>:5173` (popř. port dle spuštění)
4) Na mobilu v případě varování nainstalujte CA: `https://<VAŠE_IP>:5173/ca.crt`

### HTTP + Chrome flag (rychlá dev varianta)

1) Chrome na mobilu: `chrome://flags/#unsafely-treat-insecure-origin-as-secure` → Enabled
2) Do pole přidejte `http://<VAŠE_IP>:<port>`
3) Restartujte Chrome, spusťte `npm run dev` (HTTP), otevřete `http://<VAŠE_IP>:<port>`

## Kvalita kódu a styl

- ESLint (Standard) + Prettier; jednotný styl.
  - Lint: `npm run lint`
  - Formát: `npm run format`
- JSDoc u exportovaných funkcí a důležitých helperů. Typy jako `Card`, `WorkbookPayload` apod.
- Viz také `AGENTS.md` – pokyny pro agenty/vývojáře (architektura, konvence, omezení, testy).

## Testy a kontroly

- Unit testy (Vitest) pro `src/srs.js`: `npm test`
- E2E smoke (Playwright core): `npm run e2e`
- Self‑check panel přímo v UI („Spustit kontrolu“) – ukáže PASS/FAIL důležitého prostředí (SW, manifest, cache, localStorage, SheetJS, klávesy, audio, offline cache hit).

## Řešení problémů (FAQ)

- 404 `/src/main.js` v dev: udělejte tvrdý reload (Ctrl+F5). Dev-server mapuje `/src/*` interně.
- Nelze nainstalovat PWA na mobilu: buď HTTPS s důvěryhodným certem (doporučeno), nebo dočasně Chrome flag (HTTP výjimka pro váš origin).
- Port už je zabraný: `npm run dev -- --port 5175` a otevřít přesně výpis „Network:“ z terminálu.
