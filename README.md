# Skydark Family Calendar

A family organization panel for Home Assistant: calendar, chores, lists, meals, photos, rewards, and more.

## Install (HACS)

1. Open **HACS** → **Integrations** → **⋮** (three dots) → **Custom repositories**
2. Add: `https://github.com/HunterJacobs/SkyDark` → Category: **Integration**
3. Search **Skydark Family Calendar** → **Download** → Restart Home Assistant
4. Go to **Settings** → **Devices & Services** → **Add Integration** → **Skydark Family Calendar**
5. Open **Skydark Calendar** from the sidebar

## Manual Install

1. [Download](https://github.com/HunterJacobs/SkyDark/archive/refs/heads/main.zip) and extract
2. Copy the `custom_components/skydark_calendar` folder into your Home Assistant `config/custom_components/` folder
3. Restart Home Assistant
4. Add the integration via **Settings** → **Devices & Services**

## Features

Calendar • Chores & tasks • Lists • Meals • Photos • Rewards • Sleep routines

## Troubleshooting

- **White screen or 403 when opening Skydark Calendar / on refresh**  
  The panel is served at `/skydark` and `/skydark/index.html`. If you see a white screen or "403 Forbidden" when opening the panel or refreshing the URL, ensure you're on the latest version of the integration. The integration registers a redirect from `/skydark` (and `/skydark/`) to `/skydark/index.html` so that direct loads and refreshes work. After updating, restart Home Assistant.

- **Console messages (Roboto preload, iframe sandbox, layout)**  
  Warnings about "preloaded with link preload was not used", "iframe … allow-scripts and allow-same-origin", or "Layout was forced before the page was fully loaded" come from the Home Assistant dashboard or browser and are harmless; they do not prevent the Skydark panel from working.

## Installation

### Installation via HACS (recommended)

1. **Add the custom repository in HACS**
   - Open **HACS** → **Integrations**.
   - Click the three dots (⋮) → **Custom repositories**.
   - Enter the repository URL: `https://github.com/HunterJacobs/SkyDark`.
   - Set category to **Integration** → **Add**.

2. **Install the integration**
   - In HACS → **Integrations**, search for **Skydark Family Calendar**.
   - Click **Download** and restart Home Assistant when prompted.

3. **Configure and use**
   - Go to **Settings** → **Devices & Services** → **Add Integration** → search for **Skydark Family Calendar**.
   - Complete the setup (family name, optional weather entity).
   - Open the **Skydark Calendar** panel from the sidebar.

### Manual installation

#### 1. Copy custom component

Copy the `custom_components/skydark_calendar` folder into your Home Assistant `config` directory:

```
config/
  custom_components/
    skydark_calendar/
      __init__.py
      manifest.json
      config_flow.py
      const.py
      database.py
      calendar.py
      sensor.py
      services.py
      google_calendar.py
      microsoft_calendar.py
      services.yaml
      strings.json
      translations/
      www/          # frontend build output (included)
```

#### 2. Restart Home Assistant

Restart HA so the integration is loaded.

#### 3. Add integration

- Go to **Settings** → **Devices & Services** → **Add Integration**
- Search for **Skydark Family Calendar**
- Enter your family name and optionally a weather entity
- Finish the setup

#### 4. Open the panel

- In the sidebar, open **Skydark Calendar** (calendar icon and title).
- The panel loads the React app from `/skydark/`.

## Publishing to GitHub

To publish this integration to your own GitHub repository:

1. In the project root, run:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: Skydark Family Calendar integration"
   git remote add origin https://github.com/HunterJacobs/SkyDark.git
   git branch -M main
   git push -u origin main
   ```

After pushing, others can install via HACS by adding your repo URL as a custom repository (Integration).

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev    # Vite dev server
npm run build  # Builds into custom_components/skydark_calendar/www
npm run test   # Vitest
```

### Backend

The backend is the Home Assistant custom component. Use a Python environment matching your HA version if you run tests locally. The SQLite database is created at `config/skydark_calendar/skydark_calendar.db` after the first run.

## Services

- `skydark_calendar.add_event`: title, start_time, end_time, all_day?, calendar_id?, description?, location?
- `skydark_calendar.complete_task`: task_id, completed_date?
- `skydark_calendar.add_list_item`: list_id, content
- `skydark_calendar.send_notification`: message, title?

## Automations

The integration fires `skydark_calendar_event_created` when an event is added via the service. Use it as a trigger in automations.

## Google / Microsoft Calendar

Stubs are in place (`google_calendar.py`, `microsoft_calendar.py`). Full OAuth and two-way sync can be added later.

## UI

The UI follows the Skydark reference: light background `#F8FAFB`, accent `#3B9BBF`, pastel event colors, 80px sidebar, FAB bottom-right. Optimized for landscape tablet (e.g. 15" display).
