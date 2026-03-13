"""Skydark Family Calendar integration for Home Assistant."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import homeassistant.helpers.config_validation as cv
from homeassistant.components.frontend import async_register_built_in_panel, async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import DB_NAME, DOMAIN, PANEL_ICON, PANEL_TITLE, PANEL_URL
from .database import SkydarkDatabase
from .websocket_api import async_register_websocket_handlers

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.CALENDAR, Platform.SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up the Skydark Calendar component."""
    hass.data.setdefault(DOMAIN, {})
    return True


# All Skydark services; unregistered on unload.
_SERVICES = (
    "add_event",
    "complete_task",
    "add_points",
    "redeem_reward",
    "add_list_item",
    "create_list",
    "add_meal_recipe",
    "upload_photo",
    "send_notification",
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Skydark Calendar from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    try:
        www_path = Path(__path__[0]) / "www"
        www_exists = await hass.async_add_executor_job(www_path.exists)
        if www_exists:
            await hass.http.async_register_static_paths(
                [StaticPathConfig(PANEL_URL, str(www_path), cache_headers=False)]
            )
            _LOGGER.debug("Registered static path %s -> %s", PANEL_URL, www_path)

        async_remove_panel(hass, "skydark")
        async_register_built_in_panel(
            hass,
            component_name="iframe",
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            frontend_url_path="skydark",
            config={"url": f"{PANEL_URL}/index.html"},
            require_admin=False,
        )

        db_path = Path(hass.config.config_dir) / DOMAIN / DB_NAME
        await hass.async_add_executor_job(
            lambda: db_path.parent.mkdir(parents=True, exist_ok=True)
        )
        db = SkydarkDatabase(db_path)
        await hass.async_add_executor_job(db.init)
        hass.data[DOMAIN]["db"] = db
        hass.data[DOMAIN]["panel_url"] = PANEL_URL
        hass.data[DOMAIN]["entry_id"] = entry.entry_id
        hass.data[DOMAIN]["config"] = {**entry.data, **(entry.options or {})}

        await async_register_websocket_handlers(hass)

        from . import services as skydark_services

        await skydark_services.async_setup_services(hass)

        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
        return True
    except Exception as err:
        _LOGGER.exception("Skydark Calendar setup failed: %s", err)
        async_remove_panel(hass, "skydark")
        if DOMAIN in hass.data:
            hass.data[DOMAIN].pop("db", None)
            hass.data[DOMAIN].pop("panel_url", None)
            hass.data[DOMAIN].pop("entry_id", None)
            hass.data[DOMAIN].pop("config", None)
        return False


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    for name in _SERVICES:
        hass.services.async_remove(DOMAIN, name)
    if DOMAIN in hass.data:
        hass.data[DOMAIN].pop("db", None)
        hass.data[DOMAIN].pop("panel_url", None)
        hass.data[DOMAIN].pop("entry_id", None)
        hass.data[DOMAIN].pop("config", None)
        hass.data[DOMAIN].pop("ws_registered", None)
    async_remove_panel(hass, "skydark")
    return unload_ok
