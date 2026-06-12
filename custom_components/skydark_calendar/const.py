"""Constants for Skydark Family Calendar integration."""

DOMAIN = "skydark_calendar"

# Panel
PANEL_URL = "/skydark"
# HA iframe toolbar uses this as panel.title; use ZWSP so the top bar does not show "Skydark" (sidebar entry stays)
PANEL_TITLE = "\u200b"
PANEL_ICON = "mdi:calendar-month"

# Config keys
CONF_FAMILY_NAME = "family_name"
CONF_WEATHER_ENTITY = "weather_entity"
CONF_REMOTE_CALENDAR_ENTITIES = "remote_calendar_entities"
CONF_CALENDAR_PREVIEW_CAMERAS = "calendar_preview_cameras"

# All configuration is now done through the Home Assistant UI (Settings → Devices & Services).
# There are no hard-coded defaults — users configure everything during setup or later via the Settings tab.

# Database
DB_NAME = "skydark_calendar.db"

# Photos: stored in Media > My Media > Calendar Images
CALENDAR_IMAGES_DIR = "Calendar Images"
MEDIA_SOURCE_PREFIX = "media-source://media_source/local"

# Sync intervals (seconds)
GOOGLE_SYNC_INTERVAL = 900  # 15 minutes
MICROSOFT_SYNC_INTERVAL = 900  # 15 minutes
