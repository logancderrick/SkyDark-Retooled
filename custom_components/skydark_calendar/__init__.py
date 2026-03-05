"""Skydark Family Calendar integration for Home Assistant."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import DB_NAME, DOMAIN, PANEL_ICON, PANEL_TITLE, PANEL_URL
from .database import SkydarkDatabase
from .websocket_api import async_register_websocket_handlers

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.CALENDAR, Platform.SENSOR]


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up the Skydark Calendar component."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Skydark Calendar from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Serve frontend static files from www/
    www_path = Path(__path__[0]) / "www"
    if www_path.exists():
        await hass.http.async_register_static_paths(
            [StaticPathConfig(PANEL_URL, str(www_path), False)]
        )

    # Register the panel (iframe that loads our frontend)
    if "skydark" not in (hass.data.get("frontend_panels") or {}):
        async_register_built_in_panel(
            hass,
            component_name="iframe",
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            frontend_url_path="skydark",
            config={"url": f"{PANEL_URL}/index.html"},
            require_admin=False,
        )

    # Database
    db_path = Path(hass.config.config_dir) / DOMAIN / DB_NAME
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db = SkydarkDatabase(db_path)
    await hass.async_add_executor_job(db.init)
    hass.data[DOMAIN]["db"] = db

    # Store panel URL and config for frontend
    hass.data[DOMAIN]["panel_url"] = PANEL_URL
    hass.data[DOMAIN]["entry_id"] = entry.entry_id
    hass.data[DOMAIN]["config"] = entry.data

    # Register WebSocket API for frontend
    await async_register_websocket_handlers(hass)

    # Register services
    from . import services as skydark_services

    if not hass.services.has_service(DOMAIN, "add_event"):
        await skydark_services.async_setup_services(hass)

    # Set up platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok and DOMAIN in hass.data:
        hass.data[DOMAIN].pop("db", None)
        hass.data[DOMAIN].pop("panel_url", None)
        hass.data[DOMAIN].pop("entry_id", None)
        hass.data[DOMAIN].pop("config", None)
    return unload_ok
