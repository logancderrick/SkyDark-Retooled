"""Merge events from Home Assistant calendar entities (e.g. remote calendar integration)."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime
from typing import Any

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)


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


def _ha_service_event_to_skydark_row(
    entity_id: str, ev: dict[str, Any], index: int
) -> dict[str, Any] | None:
    """Map calendar.get_events response item to Skydark websocket event shape."""
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


async def async_fetch_ha_calendar_events(
    hass: HomeAssistant,
    entity_id: str,
    start: datetime,
    end: datetime,
) -> list[dict[str, Any]]:
    """Fetch events from one HA calendar entity via calendar.get_events."""
    try:
        result = await hass.services.async_call(
            "calendar",
            "get_events",
            {
                "start_date_time": start,
                "end_date_time": end,
            },
            target={"entity_id": entity_id},
            blocking=True,
            return_response=True,
        )
    except Exception as err:
        _LOGGER.warning("Remote calendar %s: %s", entity_id, err)
        return []

    if not isinstance(result, dict):
        return []
    events = result.get("events")
    if not isinstance(events, list):
        return []

    rows: list[dict[str, Any]] = []
    for i, ev in enumerate(events):
        if not isinstance(ev, dict):
            continue
        row = _ha_service_event_to_skydark_row(entity_id, ev, i)
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
            merged.extend(remote)
        except Exception as err:
            _LOGGER.warning("merge remote calendar %s failed: %s", eid, err)

    merged.sort(key=lambda r: (r.get("start_time") or ""))
    return merged
