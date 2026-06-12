# Configurable Home Assistant URL

You can now set a custom Home Assistant instance URL directly from the SkyDark Settings tab. This allows each user to point to their own HA instance without touching environment variables or config files.

---

## How It Works

### Default Behavior (No Configuration)

- **Production** (inside Home Assistant): Automatically uses `window.location.origin` (your HA instance's URL)
- **Development** (`npm run dev`): Uses `VITE_HASS_URL` from `.env.local`

### Custom URL (Optional)

If you want to use a different HA instance than the one currently serving SkyDark:

1. **Settings** → **Display** → **Home Assistant** section
2. Enter your HA URL:
   - `https://ha.example.com`
   - `http://homeassistant.local:8123`
   - `http://192.168.1.50:8123`
3. Click away from the input field
4. **Reload the page** for the change to take effect

---

## Use Cases

### Your Household (ha.phishhost.com)
- Install SkyDark in your HA
- Leave the URL field blank (default to current origin)
- Done!

### Friend's Household
- Clone your repo
- Install in their HA (different instance)
- Leave the URL blank → it auto-detects their HA instance
- Done!

### Multiple HA Instances (Advanced)
- Running a test HA instance separately?
- Want to test SkyDark against a staging server?
- Point to any URL with the custom URL field

### Reverse Proxy / Custom Domain
- HA runs behind nginx at `https://ha.company.internal`
- Browser talks to that domain
- SkyDark auto-detects it ✓

---

## Technical Details

### Storage
- Custom URL is stored in browser `localStorage` under key `skyDarkCustomHassUrl`
- Also saved in app settings (backend) for persistence
- Survives page reloads until explicitly cleared

### Validation
- URL must start with `http://` or `https://`
- Must be valid URL syntax
- Invalid URLs are rejected with an error message

### Fallback Chain
SkyDark checks URLs in this order:

1. **localStorage** (custom URL set in Settings) ← **Priority** (if you set it here, it's used first)
2. **Environment variable** (`VITE_HASS_URL` in dev only)
3. **Current window origin** (production default)

### Clearing the Custom URL
- Delete the text in the Settings field
- Leave it blank
- Save (by clicking away)
- Message: "Custom HA URL cleared. Using current origin on next reload."

---

## When to Use

### ✅ Use Custom URL If:
- Your HA instance is on a different domain than where SkyDark is running
- You're developing locally against a remote HA instance
- You're testing SkyDark against multiple HA deployments

### ❌ Don't Need Custom URL If:
- SkyDark is running in the same HA instance (99% of users)
- The panel is accessed at the same origin as HA
- You're using standard HA installation (local IP, localhost, or reverse proxy with same origin)

---

## Troubleshooting

### "URL saved. Reload the page to reconnect."
- This is normal!
- The new URL is stored but won't be used until you reload
- After reload, SkyDark will try to connect to the new URL
- If it's wrong, you'll see WebSocket errors in browser console

### "Invalid URL format"
- Make sure you include the scheme: `http://` or `https://`
- Examples:
  - ✅ `https://ha.example.com`
  - ✅ `http://192.168.1.50:8123`
  - ❌ `ha.example.com` (missing scheme)
  - ❌ `ftp://ha.example.com` (only http/https allowed)

### WebSocket connection fails after setting URL
- Check that the URL is reachable from your browser
- Try in a new browser tab first: `https://your-url:8123`
- Ensure any reverse proxies are configured correctly
- Check browser console (`F12` → Console) for detailed error messages

### Settings from old HA not showing up
- Each HA instance has its own database
- Changing the HA URL means you're connecting to a different instance
- That instance won't have data from the old one
- This is expected behavior

---

## For Forkers

When your friend forks this repo for their own HA:

1. They install normally → SkyDark connects to their HA automatically
2. No `.env` file tweaking needed
3. They can still use the custom URL field if they ever want to switch instances

The custom URL is stored locally in **localStorage**, so it survives across updates and reloads.

---

## Example Scenarios

### Scenario 1: Your Setup
```
• HA running at: https://ha.phishhost.com
• SkyDark installed in that HA
• Access SkyDark at: https://ha.phishhost.com/skydark
→ Custom URL field: Leave blank (auto-detects)
```

### Scenario 2: Friend's Setup
```
• HA running at: http://homeassistant.local:8123
• SkyDark installed in that HA
• Access SkyDark at: http://homeassistant.local:8123/skydark
→ Custom URL field: Leave blank (auto-detects)
```

### Scenario 3: Dev Testing (Pointing to Remote HA)
```
• Local SkyDark dev server: http://localhost:5173
• Remote test HA: https://test-ha.internal
• Custom URL field: https://test-ha.internal
→ Dev server proxies /api calls to test HA
```

---

## Questions?

See [SETUP.md](SETUP.md) for general configuration or check the in-app help in the Settings tab.
