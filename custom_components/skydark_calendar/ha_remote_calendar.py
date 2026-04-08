"""Merge events from Home Assistant calendar entities (e.g. remote calendar integration)."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import date, datetime, timedelta
from typing import Any

from homeassistant.components.calendar import CalendarEntity
from homeassistant.components.calendar.const import DATA_COMPONENT
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)


def parse_skydark_ws_event_range(start_str: str, end_str: str) -> tuple[datetime, datetime]:
    """Turn panel date strings (YYYY-MM-DD or ISO datetime) into an inclusive local range for HA.

    Date-only end dates are expanded to end-of-day local time so events on the last day are included.
    Previously end was midnight at the start of that day, which excluded almost all events.
    """

    def _parse_start(s: str) -> datetime:
        raw = s.strip()
        if "T" in raw or raw.endswith("Z"):
            parsed = dt_util.parse_datetime(raw.replace("Z", "+00:00"))
            if parsed is None:
                raise ValueError(f"Invalid start datetime: {s!r}")
            return dt_util.as_local(parsed)
        d = dt_util.parse_date(raw)
        if d is None:
            raise ValueError(f"Invalid start date: {s!r}")
        return dt_util.start_of_local_day(d)

    def _parse_end_inclusive(s: str) -> datetime:
        raw = s.strip()
        if "T" in raw or raw.endswith("Z"):
            parsed = dt_util.parse_datetime(raw.replace("Z", "+00:00"))
            if parsed is None:
                raise ValueError(f"Invalid end datetime: {s!r}")
            return dt_util.as_local(parsed)
        d = dt_util.parse_date(raw)
        if d is None:
            raise ValueError(f"Invalid end date: {s!r}")
        # Inclusive end of that calendar day in the HA default timezone
        next_day = d + timedelta(days=1)
        start_next = dt_util.start_of_local_day(next_day)
        return start_next - timedelta(microseconds=1)

    start = _parse_start(start_str)
    end = _parse_end_inclusive(end_str)
    if start > end:
        start, end = end, start
    return (start, end)


def parse_frontend_app_settings(settings_map: dict[str, str]) -> dict[str, Any]:
    """Parse the JSON blob stored under frontend_app_settings_v1."""
    raw = settings_map.get("frontend_app_settings_v1", "{}")
    try:
        data = json.loads(raw) if isinstance(raw, str) else {}
        return data if isinstance(data, dict) else {}
    except (TypeError, ValueError):
        return {}


def get_remote_calendar_entity_ids(app_blob: dict[str, Any]) -> list[str]:
    """Return calendar.* entity ids from app settings (camelCase or snake_case)."""
    raw = app_blob.get("remoteCalendarEntities") or app_blob.get("remote_calendar_entities") or []
    if isinstance(raw, str):
        parts = [x.strip() for x in raw.replace("\n", ",").split(",") if x.strip()]
        return [x for x in parts if x.startswith("calendar.")]
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if str(x).strip().startswith("calendar.")]
    return []


def _infer_all_day_from_start(start_val: str) -> bool:
    s = start_val.strip()
    if "T" in s:
        return False
    return len(s) <= 10


def _ha_dict_event_to_skydark_row(
    entity_id: str, ev: dict[str, Any], index: int
) -> dict[str, Any] | None:
    """Map calendar event fields (dict) to Skydark websocket event shape."""
    start = ev.get("start")
    if start is None:
        return None
    start_s = str(start)
    end_raw = ev.get("end")
    end_s = str(end_raw) if end_raw is not None else None

    all_day = bool(ev.get("all_day")) or _infer_all_day_from_start(start_s)
    title = str(ev.get("summary") or "").strip() or "(No title)"
    description = str(ev.get("description") or "")
    location = str(ev.get("location") or "")

    id_seed = f"{ev.get('uid') or ''}:{start_s}:{end_s or ''}:{index}"
    digest = hashlib.sha256(f"{entity_id}:{id_seed}".encode()).hexdigest()[:16]
    evt_id = f"ha-remote:{entity_id}:{digest}"

    return {
        "id": evt_id,
        "title": title,
        "description": description,
        "start_time": start_s,
        "end_time": end_s,
        "all_day": 1 if all_day else 0,
        "location": location,
        "calendar_id": None,
        "calendar_ids": json.dumps([entity_id]),
        "external_id": ev.get("uid"),
        "external_source": entity_id,
        "recurrence_rule": None,
        "color": None,
        "created_at": None,
        "updated_at": None,
    }


def _calendar_entity_event_to_dict(ev: Any) -> dict[str, Any]:
    """Convert homeassistant.components.calendar.CalendarEvent to service-style dict."""
    start = ev.start
    end = ev.end
    if isinstance(start, datetime):
        start_out = dt_util.as_local(start).isoformat()
    elif isinstance(start, date):
        start_out = start.isoformat()
    else:
        start_out = str(start)
    if isinstance(end, datetime):
        end_out = dt_util.as_local(end).isoformat()
    elif isinstance(end, date):
        end_out = end.isoformat()
    else:
        end_out = str(end) if end is not None else None
    return {
        "summary": ev.summary,
        "description": ev.description,
        "location": ev.location,
        "start": start_out,
        "end": end_out,
        "uid": ev.uid,
        "all_day": ev.all_day,
    }


async def async_fetch_ha_calendar_events(
    hass: HomeAssistant,
    entity_id: str,
    start: datetime,
    end: datetime,
) -> list[dict[str, Any]]:
    """Fetch events from one HA calendar entity via CalendarEntity.async_get_events."""
    try:
        component = hass.data.get(DATA_COMPONENT)
        if component is None:
            _LOGGER.warning("Calendar integration not loaded; cannot fetch %s", entity_id)
            return []
        entity = component.get_entity(entity_id)
        if entity is None:
            _LOGGER.warning("Calendar entity %s not found", entity_id)
            return []
        if not isinstance(entity, CalendarEntity):
            _LOGGER.warning("%s is not a calendar entity (type=%s)", entity_id, type(entity).__name__)
            return []

        cal_events = await entity.async_get_events(
            hass,
            dt_util.as_local(start),
            dt_util.as_local(end),
        )
    except Exception as err:
        _LOGGER.warning("Remote calendar %s: %s", entity_id, err)
        return []

    rows: list[dict[str, Any]] = []
    for i, ev in enumerate(cal_events):
        ev_dict = _calendar_entity_event_to_dict(ev)
        row = _ha_dict_event_to_skydark_row(entity_id, ev_dict, i)
        if row:
            rows.append(row)
    return rows


async def merge_remote_calendar_events(
    hass: HomeAssistant,
    base_events: list[dict[str, Any]],
    settings_map: dict[str, str],
    start: datetime | None,
    end: datetime | None,
) -> list[dict[str, Any]]:
    """Append HA calendar entity events when a date range and entities are configured."""
    if not start or not end:
        return base_events

    blob = parse_frontend_app_settings(settings_map)
    entity_ids = get_remote_calendar_entity_ids(blob)
    if not entity_ids:
        return base_events

    merged = list(base_events)
    for eid in entity_ids:
        try:
            remote = await async_fetch_ha_calendar_events(hass, eid, start, end)
            _LOGGER.debug(
                "Merged %d remote event(s) from %s",
                len(remote),
                eid,
            )
            merged.extend(remote)
        except Exception as err:
            _LOGGER.warning("merge remote calendar %s failed: %s", eid, err)

    merged.sort(key=lambda r: (r.get("start_time") or ""))
    return merged
