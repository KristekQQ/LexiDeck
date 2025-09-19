Agent Guide for LexiDeck

Scope: Entire repository. Please follow these conventions when editing or extending this project.

Architecture
- Static SPA (Vite + vanilla JS, no TS) located under `public` (HTML, manifest, SW) and `src` (modules).
- Offline-first PWA: Service Worker lives at `/sw.js` (in `public/`), manifest at `public/manifest.webmanifest`.
- Core modules under `src/`:
  - `excel.js`: Client-side parsing of `.xlsx` via SheetJS (CDN global `XLSX`). Read-only fetch of `data/sample.xlsx` if present.
  - `srs.js`: Leitner SRS (boxes 1–5) and scheduling/due selection.
  - `storage.js`: LocalStorage persistence, merge by `english` (case-insensitive), reset.
  - `audio.js`: Pronunciation playback: prefer direct audio URLs, fallback to Web Speech API (en-US).
  - `ui.js`: DOM interactions, flip-card, keybinds, self-check panel, selection of sheet.
  - `main.js`: App bootstrap, SW registration, PWA install handler.

Important constraints
- Do NOT write or modify `data/sample.xlsx`. It is user data. Only read via fetch (`/data/sample.xlsx`) or using file input.
- Keep dev server ports configurable. We currently default to 5173; allow overrides via CLI flags (`npm run dev -- --port 5175`).
- Keep everything framework-free, ES modules only.
- Keep modules pure and reusable; do not introduce global variables beyond the minimal bootstrap.

Coding style
- JavaScript only (no TypeScript).
- Use JSDoc for all exported functions and important helpers. Prefer `@typedef` for shared structures (e.g., `Card`).
- Avoid one-letter variables (unless idiomatic in local scopes).
- Keep changes minimal and focused. Do not refactor unrelated code unless asked.
- Follow ESLint Standard + Prettier; run `npm run lint` and `npm run format` if you touch code.

Testing & QA
- Unit tests: Vitest for `src/srs.js` (extend if you modify scheduling logic).
- E2E smoke: Playwright core script `scripts/pw-smoke.js` visits the app and runs the self-check.
- Self-check panel is in the UI (button “Spustit kontrolu”); keep it working when changing critical paths.

PWA specifics
- SW must be served from `/sw.js` (root scope) for proper installability.
- Manifest must remain at `/manifest.webmanifest` and include `name`, `short_name`, `start_url`, `scope`, icons, and theme/background colors.
- For HTTPS in dev, prefer mkcert-based certs. We provide helper scripts, but do not force HTTPS; support HTTP plus Chrome flag flow for convenience.

Excel parsing
- Use the global `XLSX` (from CDN in `public/index.html`). Do not add NPM SheetJS just for parsing in the app bundle.
- Header detection is case-insensitive with aliases; if missing, fallback to positional mapping: col1=english, col2=translation, col3=pronunciationUrl, while skipping a non-data first row when col1/col2 are empty.

Data model
- LocalStorage key: `vocabProgress:<sheetName>` with array of `Card` objects.
- Merge progress by `english` (case-insensitive), keep progress fields.

Dev commands
- `npm run dev` (port 5173; can override with `--port <n>`)
- `npm run build` then `npm run preview`
- `npm run e2e` (Playwright core smoke)
- `npm run lint`, `npm test`

If you introduce new files or modules, add JSDoc and update this AGENTS.md if conventions change.

