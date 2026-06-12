"""Config flow for Skydark Family Calendar."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import (
    CONF_FAMILY_NAME,
    CONF_WEATHER_ENTITY,
    CONF_REMOTE_CALENDAR_ENTITIES,
    CONF_CALENDAR_PREVIEW_CAMERAS,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_FAMILY_NAME): str,
        vol.Optional(CONF_WEATHER_ENTITY): selector.EntitySelector(
            selector.EntitySelectorConfig(
                domain="weather",
                multiple=False,
            )
        ),
        vol.Optional(CONF_REMOTE_CALENDAR_ENTITIES): str,
        vol.Optional(CONF_CALENDAR_PREVIEW_CAMERAS): str,
    }
)


async def validate_input(_hass: HomeAssistant, data: dict[str, Any]) -> dict[str, Any]:
    """Validate config."""
    family_name = data.get(CONF_FAMILY_NAME, "").strip()
    if not family_name:
        raise ValueError("Family name is required")

    # Parse remote calendar entities (comma or newline separated)
    remote_cals = []
    if data.get(CONF_REMOTE_CALENDAR_ENTITIES):
        raw = data[CONF_REMOTE_CALENDAR_ENTITIES]
        entities = [e.strip() for e in raw.replace(",", "\n").split("\n")]
        remote_cals = [e for e in entities if e.startswith("calendar.")]

    # Parse camera entities (comma or newline separated)
    cameras = []
    if data.get(CONF_CALENDAR_PREVIEW_CAMERAS):
        raw = data[CONF_CALENDAR_PREVIEW_CAMERAS]
        entities = [e.strip() for e in raw.replace(",", "\n").split("\n")]
        cameras = [e for e in entities if e.startswith("camera.")][:2]  # Max 2 cameras

    # Build cleaned data to store
    cleaned = {
        CONF_FAMILY_NAME: family_name,
    }
    if data.get(CONF_WEATHER_ENTITY):
        cleaned[CONF_WEATHER_ENTITY] = data[CONF_WEATHER_ENTITY]
    if remote_cals:
        cleaned[CONF_REMOTE_CALENDAR_ENTITIES] = remote_cals
    if cameras:
        cleaned[CONF_CALENDAR_PREVIEW_CAMERAS] = cameras

    return {"title": family_name, "config": cleaned}


class SkydarkConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Skydark Family Calendar."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            try:
                info = await validate_input(self.hass, user_input)
            except ValueError as err:
                errors["base"] = str(err)
            else:
                await self.async_set_unique_id("skydark_calendar")
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title=info["title"], data=info.get("config", user_input))

        return self.async_show_form(
            step_id="user",
            data_schema=CONFIG_SCHEMA,
            errors=errors,
            description_placeholders={
                "name": "Skydark Calendar",
                "setup_help": "All settings can be customized later in the Skydark Settings tab or here. Leave optional fields blank if you want to set them up in the app later.",
            },
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> SkydarkOptionsFlow:
        """Get the options flow for this handler."""
        return SkydarkOptionsFlow()


class SkydarkOptionsFlow(config_entries.OptionsFlow):
    """Handle Skydark options."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options."""
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                info = await validate_input(self.hass, user_input)
            except ValueError as err:
                errors["base"] = str(err)
            else:
                return self.async_create_entry(title="", data=info.get("config", user_input))

        # Get current values from options first, then fall back to data
        def get_current(key: str, default: str = "") -> str:
            return (
                self.config_entry.options.get(key)
                or self.config_entry.data.get(key, default)
            )

        # Format remote calendars and cameras as newline-separated for display
        remote_cals = get_current(CONF_REMOTE_CALENDAR_ENTITIES)
        if isinstance(remote_cals, list):
            remote_cals = "\n".join(remote_cals)

        cameras = get_current(CONF_CALENDAR_PREVIEW_CAMERAS)
        if isinstance(cameras, list):
            cameras = "\n".join(cameras)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_FAMILY_NAME,
                        default=get_current(CONF_FAMILY_NAME, "Family"),
                    ): str,
                    vol.Optional(
                        CONF_WEATHER_ENTITY,
                        default=get_current(CONF_WEATHER_ENTITY),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="weather",
                            multiple=False,
                        )
                    ),
                    vol.Optional(
                        CONF_REMOTE_CALENDAR_ENTITIES,
                        default=remote_cals,
                    ): str,
                    vol.Optional(
                        CONF_CALENDAR_PREVIEW_CAMERAS,
                        default=cameras,
                    ): str,
                }
            ),
            errors=errors,
        )
