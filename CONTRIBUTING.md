# Contributing to Skydark Family Calendar

This doc is for anyone who wants to run, build, or change the code — new or experienced.

---

## Before you start

- **Users** (just installing): see the [README](README.md#install-hacs-recommended).
- **Developers**: this file + the [Repository structure](README.md#repository-structure) in the README.

---

## Running the app locally

### Frontend only (no Home Assistant)

Good for UI, layout, and component work:

```bash
cd frontend
npm install
npm run dev
```

Opens a Vite dev server at (typically) `http://localhost:5173/skydark/`. Without Home Assistant, the panel will try OAuth against whatever origin the dev server is on; use **demo mode** below to preview the full dashboard with sample data instead.

### Demo mode (full UI, no HA, no push)

Use this to review calendar, chores, lists, and top cards on a branch before merging or installing into Home Assistant:

```bash
cd frontend
npm run dev:demo
```

Then open **`http://localhost:5173/skydark/#/calendar`** (hash router). This loads `.env.demo`, which sets `VITE_SKYDARK_DEMO=true`. The app skips the HA WebSocket and uses **built-in sample events, tasks, lists, and family data** (`src/dev/demoSkydarkData.ts`). Weather widgets still call **Open-Meteo** from your browser (ZIP or geolocation). Live **camera** tiles need a real HA connection; in demo mode the camera card shows the “configure cameras” placeholder unless you point a dev build at HA.

A yellow **“Demo mode”** banner appears under the header so you do not confuse this with production.

To talk to a real Home Assistant instance from the dev server, use `npm run dev` (not `dev:demo`) and sign in, or open the built panel through HA (e.g. `/skydark`).

### Full stack (frontend + Home Assistant)

1. Install the integration into your Home Assistant (see README).
2. Build the frontend and copy it into the integration:

   ```bash
   cd frontend
   npm run build
   ```

   The build output goes to `custom_components/skydark_calendar/www/`. Restart Home Assistant if the integration was already loaded.

---

## Project layout (quick ref)

| Part | Where | Tech |
|------|--------|------|
| **Backend** | `custom_components/skydark_calendar/` | Python, Home Assistant integration |
| **Frontend** | `frontend/` | React, TypeScript, Vite, Tailwind |
| **API** | `frontend/src/lib/skyDarkApi.ts` ↔ `websocket_api.py` | WebSocket commands (`skydark_calendar/*`) |
| **Data** | `database.py` + SQLite | Stored under HA `config/skydark_calendar/` |

Changing the UI: work in `frontend/src/` (views, components, contexts).  
Changing data or HA behavior: work in `custom_components/skydark_calendar/` (database, services, websocket_api).

---

## Commands

| Command | Where | What it does |
|--------|--------|----------------|
| `npm run dev` | `frontend/` | Start Vite dev server |
| `npm run build` | `frontend/` | TypeScript + Vite build → `custom_components/.../www` |
| `npm run test` | `frontend/` | Run Vitest tests |
| `npm run test:watch` | `frontend/` | Vitest watch mode |

---

## Making a change and testing

1. **Frontend change**  
   - Edit files under `frontend/src/`.  
   - Run `npm run dev` to test in the browser, or `npm run build` and restart HA to test in the panel.

2. **Backend change**  
   - Edit Python under `custom_components/skydark_calendar/`.  
   - Restart Home Assistant (or reload the integration) and test in the Skydark panel.

3. **New WebSocket command or service**  
   - Backend: add handler in `websocket_api.py` or register a service in `services.py` and `services.yaml`.  
   - Frontend: add a function in `skyDarkApi.ts` that sends the right message or calls the service.

---

## Code style

- **Frontend**: TypeScript, React function components; existing style in `frontend/src/` is the reference.
- **Backend**: Follow existing Python style in `custom_components/skydark_calendar/`; HA integration conventions apply.

---

## Questions or issues

Open an issue or discussion on [this fork’s GitHub](https://github.com/logancderrick/SkyDark-Retooled). For install/config problems, check the [README Troubleshooting](README.md#troubleshooting) section first. The original project is [HunterJacobs/SkyDark](https://github.com/HunterJacobs/SkyDark).
