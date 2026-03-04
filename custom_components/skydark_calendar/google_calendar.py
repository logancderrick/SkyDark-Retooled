"""Google Calendar sync - OAuth and two-way sync (stub for future implementation)."""

from __future__ import annotations

import logging

_LOGGER = logging.getLogger(__name__)


async def setup_google_oauth(hass, flow_id: str, user_input: dict) -> dict:
    """Start or finish Google OAuth flow. Stub."""
    _LOGGER.info("Google Calendar OAuth not yet implemented")
    return {"type": "create_entry", "data": {}}


async def sync_google_calendar(hass, calendar_id: str, credentials: dict) -> None:
    """Sync events from Google Calendar. Stub."""
    _LOGGER.debug("Google sync stub: calendar_id=%s", calendar_id)
