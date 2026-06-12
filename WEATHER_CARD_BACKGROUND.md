# Customizing the Weather Card Background

You can now upload a custom background image for the weather card directly from the SkyDark Settings tab. No source code editing required!

---

## How to Change the Weather Card Background

### Step 1: Open Settings
- Click the **Settings** icon in SkyDark
- Navigate to **Display** tab

### Step 2: Upload Your Image
- Find the **Weather Card** section
- Click **Choose Image**
- Select a PNG or JPG file from your computer (max 5MB)
- Preview appears immediately

### Step 3: Done!
- The image is saved automatically
- Your calendar page now shows your custom background
- Changes apply immediately (no page reload needed)

---

## Requirements

- **Format:** PNG or JPG
- **Size:** Maximum 5MB
- **Dimensions:** Recommended landscape (e.g., 1920x1080, 1280x720)
- **Best practices:** 
  - High resolution (for crisp display on large screens)
  - Light text friendly (weather text is white with dark shadow)
  - Consider contrast with white text

---

## Recommended Image Sizes

| Display | Resolution | Aspect Ratio |
|---------|-----------|--------------|
| Mobile | 800x600 | 4:3 |
| Tablet | 1024x768 | 4:3 |
| Desktop | 1920x1080 | 16:9 |
| Ultra-wide | 3440x1440 | 21:9 |

For best results, use a **landscape-oriented image** (wider than tall).

---

## Tips for Good Results

### Background Style
- ✅ **Scenic images** — mountains, beaches, sky, nature
- ✅ **Subtle gradients** — blurred colors, soft transitions
- ✅ **Photography** — weather-related landscapes work great
- ❌ **Text overlays** — avoid (will be covered by weather info)
- ❌ **Overly bright** — hard to read white text

### Text Contrast
Weather text is white with a dark shadow. Make sure:
- Don't use pure white backgrounds
- Avoid very light pastels
- Dark to medium tones work best

### File Size
- Keep under 5MB for fast loading
- Use JPG compression for photos (lossy, smaller files)
- Use PNG for graphics or when you need transparency

---

## Example Use Cases

### Scenario 1: Weather-Themed Background
```
Upload a beautiful sky photo
→ Match the weather theme
→ Updates naturally with seasons
```

### Scenario 2: Family or Household Branding
```
Upload your family logo or household photo
→ Personalize for your home
→ Makes it feel special
```

### Scenario 3: Color-Coordinated Dashboard
```
Upload a background that matches your home colors
→ Complements your interior design
→ Cohesive dashboard aesthetic
```

---

## Clearing the Custom Background

To go back to the default:
1. **Settings** → **Display** → **Weather Card**
2. Click the **Clear** button (if an image is uploaded)
3. Default background is restored immediately

---

## Storage & Persistence

- **Storage:** Custom image is saved in your app settings
- **Persistence:** Survives app updates and page reloads
- **Local only:** Image is stored locally in your browser (not synced to cloud)

---

## Troubleshooting

### Image Not Showing
- Check file format (PNG or JPG only)
- Try a different image file
- Refresh the page to force reload
- Check browser console (F12 → Console) for errors

### Image Is Blurry
- Try a higher resolution image
- Check that image dimensions match your display
- JPG compression may affect quality — try PNG

### File Size Error
- Image exceeds 5MB limit
- Reduce dimensions or compression
- Use JPG format (usually smaller than PNG)

### Image Changed Back to Default
- Browser storage was cleared
- You were signed out of Home Assistant
- Try uploading again

---

## Before & After

### Default Background
The weather card comes with a professional sky gradient background designed to work with all themes.

### Custom Background
Upload any image to make it uniquely yours — matches your style, home aesthetic, or family photos.

---

## For Forkers

When your friend forks this repo and installs SkyDark:

1. **Default background** is available out of the box
2. **They can customize it anytime** via Settings → Display → Weather Card
3. **No source code editing needed** (unlike before!)
4. **Custom image persists** across updates

The weather card background is now fully user-configurable. ✨

---

## Technical Details

### Storage Location
- **Frontend:** Browser `localStorage` (embedded in app settings)
- **Backend:** Saved with app settings in Home Assistant database
- **Format:** Stored as data URL (base64 encoded)

### How It Works
1. User uploads image via file input
2. Image is converted to data URL (base64)
3. Saved in `AppSettings.weatherBackgroundImageUrl`
4. `ImprovedWeatherCard` component uses it if available
5. Falls back to default if not set

### Performance
- **Lazy loaded:** Only downloaded when needed
- **Cached:** Browser caches the image
- **Responsive:** Scales appropriately for mobile/tablet/desktop
- **Optional:** Zero impact if not using custom image

---

## Questions?

See the [README](README.md) for general info, or check the Settings tab for in-app help.
