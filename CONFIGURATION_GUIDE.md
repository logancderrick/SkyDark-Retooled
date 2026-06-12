# Configuration Guide — No Hard-Coded Defaults

This document explains the new configuration system. **Everything is now configurable through Home Assistant's UI** — no hard-coded defaults, no need to edit Python files.

---

## How It Works

### Step 1: Initial Setup (Home Assistant Integration)

When users add the Skydark Family Calendar integration:

**Settings → Devices & Services → Add Integration → Skydark Family Calendar**

They can configure:

| Field | Type | Purpose | Required? |
|-------|------|---------|-----------|
| **Family name** | Text | Used in the panel header | Yes |
| **Weather entity** | Entity selector | Powers the weather card forecast | No |
| **Remote calendar entities** | Text (one per line) | `calendar.*` entities to merge | No |
| **Calendar preview cameras** | Text (one per line, max 2) | `camera.*` entities for the camera strip | No |

### Step 2: Fine-Tuning (SkyDark Panel Settings)

After installation, users can refine everything in the **Settings** tab:

- **General:**
  - Family name
  - Family members (add/edit/delete profiles)
  - Weather ZIP code
  - Display preferences

- **Calendar:**
  - Remote calendars (add/remove, set colors and display names)
  - Camera preview setup and rotation speed
  - Default calendar for new events

- **Lock & Security:**
  - PIN setup and management
  - Auto-relock settings
  - Per-feature access control

- **Display:**
  - Theme (light/dark)

---

## Architecture Changes

### Before
```
const.py (Python)
├── DEFAULT_FAMILY_NAME = "The Derricks"
├── DEFAULT_REMOTE_CALENDAR_ENTITIES = (...)
└── Hard-coded for the developer's family

Frontend
└── Loaded these as fallbacks
```

**Problem:** Forkers had to edit Python source code.

### After
```
config_flow.py (HA Integration Settings)
├── User provides: family_name, calendars, cameras
└── Stored in config entry

websocket_api.py
└── Passes config to frontend via /get_config

AppContext (Frontend)
├── Loads config from HA
├── Merges with user's app settings
└── Uses merged values as initial settings
```

**Solution:** All configuration through the HA UI or the app Settings tab. No source code edits needed.

---

## Migration Notes for Forkers

If you fork this repo and your users were using the old system:

1. **No action needed.** The app automatically uses the HA config flow now.
2. **Update their integration:** Have them re-install or edit **Settings → Devices & Services → Skydark Family Calendar → Options**.
3. **First-time setup:** They'll see the new configuration fields in the integration setup wizard.

---

## Files Changed

| File | Change |
|------|--------|
| **const.py** | Removed hard-coded defaults; added new config key constants |
| **config_flow.py** | Added fields for remote calendars and camera preview setup |
| **websocket_api.py** | No changes (already passes config) |
| **AppContext.tsx** | Updated to merge HA config with app settings for initial values |
| **useSkydarkData.ts** | Added remote_calendar_entities and calendar_preview_cameras to config type |
| **haConnection.ts** | Fixed DEV-only env var usage (production always uses window.location.origin) |
| **SETUP.md** | Updated with new configuration flow instructions |
| **.env.local.example** | Improved descriptions for forkers |

---

## Best Practices for Users

### First-Time Setup
1. Install the integration
2. Provide family name and (optionally) initial calendars and cameras
3. Finish installation
4. Open the SkyDark panel and go to **Settings** to refine

### Later Changes
- Edit calendars, cameras, or display settings in **Settings** tab (no restart needed)
- Edit family name or weather entity in **Settings → Devices & Services → Skydark → Options**

### For Developers Forking
- **Don't edit** `const.py` or `config_flow.py` with family-specific data
- Guide your users to use the HA UI or the Settings tab
- Document your instance-specific setup (any reverse proxies, SSL certs, etc.) in a `DEPLOYMENT.md`

---

## Technical Details

### Config Flow (Home Assistant Side)

**`config_flow.py`** now:
- Parses comma or newline-separated entity lists
- Validates that calendars start with `calendar.` and cameras with `camera.`
- Stores parsed lists in the config entry
- Allows editing via **Options** after installation

### Frontend Data Flow

```
HA Config Entry
    ↓
websocket_api.py (/get_config)
    ↓
useSkydarkData.ts (fetchConfig)
    ↓
AppContext.tsx (useLayoutEffect)
    ├─ Merges config defaults with stored app settings
    └─ Uses merged result as initial state
    ↓
Settings Tab (user can edit further)
    ↓
saveAppSettings → backend (persistent)
```

### No Hard-Coded Domains

- `haConnection.ts`: `VITE_HASS_URL` only used in dev mode
- Production builds always use `window.location.origin`
- Works out-of-the-box on any HA instance

---

## Questions?

See [SETUP.md](SETUP.md) for user setup instructions or check the **Settings** tab for in-app help.
