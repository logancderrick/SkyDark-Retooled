# Setup Guide for Forking & Customizing SkyDark

This guide helps you fork this repo and set it up for your own Home Assistant instance.

---

## Prerequisites

- **Home Assistant** running locally or on a public domain
- **Node.js 18+** (for local frontend development)
- **Git**

---

## Initial Setup

### 1. Add the Integration to Home Assistant

1. **Settings** → **Devices & Services** → **Create Automation** → **Add Integration** → **Skydark Family Calendar**
2. You'll be prompted to configure:
   - **Family name** (required): What to call your household (e.g., "The Derricks")
   - **Weather entity** (optional): A `weather.*` entity for the weather card forecast
   - **Remote calendar entities** (optional): `calendar.*` entities to merge (one per line or comma-separated)
   - **Calendar preview cameras** (optional): Up to 2 `camera.*` entities to show on the calendar page

All settings can be changed later via:
- **Settings → Devices & Services → Skydark Family Calendar** (in HA)
- **Settings tab inside the SkyDark panel** (for per-user preferences)

### 2. Clone & Install Dependencies (for development)

```bash
git clone https://github.com/YOUR_USERNAME/SkyDark-Retooled.git
cd SkyDark-Retooled
cd frontend
npm install
```

### 2. Configure Your Home Assistant URL

The integration needs to know where to find your HA instance.

#### Option A: Local Network (Recommended for Testing)

```bash
# In frontend/ directory
cp .env.local.example .env.local
```

Then edit `frontend/.env.local` and set:
```
VITE_HASS_URL=http://homeassistant.local:8123
```

Or if using a static IP:
```
VITE_HASS_URL=http://192.168.1.100:8123
```

#### Option B: Public Domain

If you have a public domain configured in HA:
```
VITE_HASS_URL=https://ha.yourdomainname.com
```

#### Option C: Custom Port or Path

```
VITE_HASS_URL=http://homeassistant.local:8124
VITE_HASS_URL=https://ha.example.com/home-assistant
```

### 3. (Optional) Add a Development Token

To skip the OAuth popup every time you restart the dev server:

1. In Home Assistant, go: **Profile** (⚙️ bottom left) → **Security**
2. Scroll to "Long-lived access tokens" → **Create token**
3. Give it a name like "SkyDark Dev"
4. Copy the token and paste into `frontend/.env.local`:

```
VITE_HASS_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Never commit this token to Git.** Keep `.env.local` in `.gitignore`.

---

## Running the Development Server

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in a browser. The dev server proxies API calls to your HA instance (configured in `VITE_HASS_URL`).

---

## Building for Production

```bash
cd frontend
npm run build
```

Output goes to `custom_components/skydark_calendar/www/`.

---

## Installing in Home Assistant

### Via HACS (Easiest for Your Own Forks)

1. **HACS** → **Integrations** → **⋮ Custom repositories**
2. Add your fork: `https://github.com/YOUR_USERNAME/SkyDark-Retooled`
3. Category: **Integration**
4. Search for **Skydark Family Calendar** → **Install**
5. **Restart Home Assistant**
6. **Settings** → **Devices & Services** → **Add Integration** → **Skydark Family Calendar**

### Manual Install

1. Copy `custom_components/skydark_calendar/` to your HA `config/custom_components/`
2. Restart HA
3. Add integration via **Settings → Devices & Services**

---

## Customizing for Your Family

### Family Name & Weather Entity

These are configured via the HA UI after installation:
- **Settings** → **Devices & Services** → **Skydark Family Calendar**
- Edit: Family name, weather entity for the forecast card

### Default Remote Calendars

By default, the app shows:
```python
calendar.logan_work_ahead
calendar.logan_work_cornelis
calendar.kaylee_work
calendar.family
```

These are set in [const.py](custom_components/skydark_calendar/const.py). Edit them or configure per-device via the UI.

### Custom Weather Background

SkyDark supports custom background images for the weather card:

1. Add a PNG or JPG to `frontend/public/` (no spaces in filename)
2. Reference it in [frontend/src/components/ImprovedWeatherCard.tsx](frontend/src/components/ImprovedWeatherCard.tsx)
3. Rebuild: `npm run build`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **White screen / 403 error** | Restart Home Assistant fully after installing |
| **Camera streams won't load** | Ensure you're logged into HA in the same browser; tokens are scoped to your login |
| **Dev server says "connection refused"** | Check `VITE_HASS_URL` in `.env.local` — HA must be reachable at that address |
| **OAuth login loop in dev** | Add `VITE_HASS_ACCESS_TOKEN` to `.env.local` to bypass OAuth |
| **Old UI showing after rebuild** | Restart dev server; clear browser cache; try incognito window |

---

## Next Steps

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for architecture & development workflow
- Explore the **[custom_components/](custom_components/)** (Python backend) and **[frontend/](frontend/)** (React frontend)
- Edit [const.py](custom_components/skydark_calendar/const.py) to customize defaults for your household
- Open a PR to share improvements!

---

## Questions or Issues?

- Check existing [GitHub Issues](https://github.com/logancderrick/SkyDark-Retooled/issues)
- Review [README.md](README.md) for feature overview and troubleshooting

Happy customizing! 🚀
