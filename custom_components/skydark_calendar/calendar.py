"""Calendar platform for Skydark Family Calendar."""

from __future__ import annotations

from datetime import datetime
from functools import partial
import logging
from typing import Any

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Skydark calendar from a config entry."""
    async_add_entities([SkydarkCalendarEntity(hass, entry)], update_before_add=True)


class SkydarkCalendarEntity(CalendarEntity):
    """Skydark family calendar entity."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_translation_key = "calendar"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize the calendar."""
        self._hass = hass
        self._attr_unique_id = f"{entry.entry_id}_calendar"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)},
            "name": entry.data.get("family_name", "Skydark Calendar"),
            "manufacturer": "Skydark",
            "model": "Family Calendar",
        }
        self._cached_event: CalendarEvent | None = None

    @property
    def event(self) -> CalendarEvent | None:
        """Return the next upcoming event (cached from last update)."""
        return self._cached_event

    async def async_update(self) -> None:
        """Fetch the next upcoming event from the database."""
        if DOMAIN not in self._hass.data:
            return
        db = self._hass.data[DOMAIN].get("db")
        if not db:
            return
        try:
            events = await self._hass.async_add_executor_job(db.get_events)
            now = dt_util.utcnow().isoformat()
            upcoming = [e for e in events if e.get("start_time", "") >= now]
            if upcoming:
                upcoming.sort(key=lambda e: e.get("start_time", ""))
                row = upcoming[0]
                self._cached_event = self._row_to_calendar_event(row)
            else:
                self._cached_event = None
        except Exception as e:
            _LOGGER.exception("Failed to update calendar entity: %s", e)

    async def async_get_events(
        self, hass: HomeAssistant, start_date: datetime, end_date: datetime
    ) -> list[CalendarEvent]:
        """Return calendar events for the given range from DB."""
        if DOMAIN not in hass.data:
            return []
        db = hass.data[DOMAIN].get("db")
        if not db:
            return []
        try:
            rows = await hass.async_add_executor_job(
                partial(db.get_events, start=start_date, end=end_date)
            )
            return [self._row_to_calendar_event(row) for row in rows]
        except Exception as e:
            _LOGGER.exception("Failed to get calendar events: %s", e)
            return []

    def _row_to_calendar_event(self, row: dict[str, Any]) -> CalendarEvent:
        """Convert a database row to a HA CalendarEvent."""
        start_str = row.get("start_time", "")
        end_str = row.get("end_time") or start_str
        start = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        end = datetime.fromisoformat(end_str.replace("Z", "+00:00"))

        return CalendarEvent(
            start=start.date() if row.get("all_day") else start,
            end=end.date() if row.get("all_day") else end,
            summary=row.get("title", ""),
            description=row.get("description"),
            location=row.get("location"),
        )
