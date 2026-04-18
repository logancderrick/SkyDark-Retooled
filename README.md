# Skydark Family Calendar (retooled fork)

Turn Home Assistant into a single family command center.

**This repository** is [Logan’s fork](https://github.com/logancderrick/SkyDark-Retooled) of [SkyDark by HunterJacobs](https://github.com/HunterJacobs/SkyDark). It keeps the same integration id (`skydark_calendar`) and panel spirit, but the UI and features have evolved here—live cameras, calendar camera preview, list persistence through HA services, layout and button fixes, merged-calendar UX, branding defaults, and more. Upstream is a great baseline; this fork is what we run day to day.

Skydark is a full-screen family organizer for Home Assistant that combines calendar, chores, lists, meals, rewards, photos, and **live cameras** in one clean panel your whole household can use.

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Custom%20Integration-41BDF5?logo=home-assistant&logoColor=white)](https://www.home-assistant.io/)
[![HACS](https://img.shields.io/badge/HACS-Custom%20Repository-41BDF5)](https://hacs.xyz/)

<img width="1918" height="943" alt="Screenshot 2026-03-17 235039" src="https://github.com/user-attachments/assets/010d9f67-8ade-409e-8eaa-eae8d4548c05" />


## Why people install SkyDark

- One place for everything your family tracks daily.
- Designed for a wall tablet or dashboard view in Home Assistant.
- Built for action, not just display: create tasks, plan meals, check lists, track rewards, skim security cameras.
- Clean, touch-friendly UI that works for both adults and kids.

## What you can do

| Area | What it does |
|------|---------------|
| **Calendar** | Month/week/day views, drag-and-drop events (week view), merged Home Assistant calendars with per-source colors and optional display names |
| **Calendar cameras** | Optional live preview strip on the calendar page—configure one or two `camera.*` entities in **Settings → Calendar**; two cameras rotate on a timer |
| **Chores** | Per-person tasks, routine frequencies, completion tracking, points |
| **Lists** | Grocery and custom lists; items and lists persist through Home Assistant services (`delete_list`, `delete_list_item`, etc.) |
| **Meals** | Weekly planner plus meal prep ingredient generation |
| **Rewards** | Points and reward redemption tracking per family member |
| **Photos** | Family photo view with sleep / screensaver support |
| **Cameras** | Live tiles via HA `camera/stream` (HLS) with MJPEG fallback, auth aligned with HA, optional entity excludes |
| **Settings** | Profiles, lock controls, feature toggles, remote calendars, calendar preview cameras, family-level preferences |

Runs as a Home Assistant custom integration and panel. Data is stored locally in your HA config using SQLite.

## Install (HACS recommended)

1. Open **HACS** → **Integrations** → **Custom repositories**
2. Add **`https://github.com/logancderrick/SkyDark-Retooled`** as category **Integration**
3. Install **Skydark Family Calendar**
4. Restart Home Assistant
5. Go to **Settings** → **Devices & Services** → **Add Integration** → **Skydark Family Calendar**
6. Open **Skydark Calendar** from the sidebar

If you previously used the upstream repo URL in HACS, switch the custom repository to this fork to receive updates from here.

## Manual install

1. Download this repo as ZIP (or clone) from **https://github.com/logancderrick/SkyDark-Retooled**
2. Copy `custom_components/skydark_calendar` into your HA `config/custom_components/` directory
3. Restart Home Assistant
4. Add **Skydark Family Calendar** in **Devices & Services**

The panel is served at `/skydark`.

## Configuration (UI only)

Skydark is set up through **Settings → Devices and services → Add integration**. It does **not** read options from `configuration.yaml`.

- **Do not** add a `skydark_calendar:` block to `configuration.yaml`. Any keys there are ignored and Home Assistant may show a repair telling you to remove them.
- **If you see that warning:** delete the `skydark_calendar:` section from your YAML, keep the integration added via the UI, then **restart Home Assistant**.

## Repository structure

| Part | Where | Tech |
|------|--------|------|
| **Backend** | `custom_components/skydark_calendar/` | Python, Home Assistant integration |
| **Frontend** | `frontend/` | React, TypeScript, Vite, Tailwind |
| **API** | `frontend/src/lib/skyDarkApi.ts` ↔ `websocket_api.py` | WebSocket commands (`skydark_calendar/*`) and HA services |
| **Data** | `database.py` + SQLite | Stored under HA `config/skydark_calendar/` |

After UI changes, run `npm run build` in `frontend/`; output is written to `custom_components/skydark_calendar/www/`.

## Best fit for

- Families using Home Assistant as the home dashboard
- Wall-tablet setups in kitchens, entryways, or living spaces
- Homes that want chores + rewards + meal planning in one workflow, plus quick camera checks from the same panel

## Services and automations

Skydark includes service calls for event/task/list/meal/reward actions and notification helpers.

Examples:

- `skydark_calendar.add_event`
- `skydark_calendar.complete_task`
- `skydark_calendar.add_list_item`
- `skydark_calendar.delete_list` / `skydark_calendar.delete_list_item`
- `skydark_calendar.add_meal`
- `skydark_calendar.send_notification`

Event automations are supported (for example, event-created triggers).  
See full service docs in **Settings** → **Devices & Services** → **Skydark Family Calendar** → **Services**.

## Troubleshooting

- **“Does not support configuration via YAML” / ignored YAML settings:** Remove `skydark_calendar:` from `configuration.yaml` and use **Devices & services** only; then restart HA (see [Configuration (UI only)](#configuration-ui-only)).
- **White screen or 403 on open/refresh**: update to latest version and fully restart Home Assistant.
- **Console warnings about fonts/sandbox/layout**: usually from HA browser context and typically harmless.
- **Camera streams 403**: ensure you are logged into HA in the same browser context; this fork sends Bearer tokens on HLS and uses camera tokens for MJPEG where applicable.

## Upstream and this fork

- **Upstream project:** [github.com/HunterJacobs/SkyDark](https://github.com/HunterJacobs/SkyDark) — original design and integration.
- **This fork:** [github.com/logancderrick/SkyDark-Retooled](https://github.com/logancderrick/SkyDark-Retooled) — ongoing changes for our household; issues and PRs are welcome here.

## For contributors

- Developer setup and architecture: [CONTRIBUTING.md](CONTRIBUTING.md)
- HACS submission notes (upstream-oriented): [docs/HACS_NEXT_STEPS.md](docs/HACS_NEXT_STEPS.md)

If SkyDark helps your household, starring **either** the upstream repo or this fork helps more Home Assistant users discover the ecosystem.
