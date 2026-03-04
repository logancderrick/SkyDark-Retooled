"""Microsoft Calendar sync - OAuth and Graph API two-way sync (stub for future implementation)."""

from __future__ import annotations

import logging

_LOGGER = logging.getLogger(__name__)


async def setup_microsoft_oauth(hass, flow_id: str, user_input: dict) -> dict:
    """Start or finish Microsoft OAuth flow. Stub."""
    _LOGGER.info("Microsoft Calendar OAuth not yet implemented")
    return {"type": "create_entry", "data": {}}


async def sync_microsoft_calendar(hass, calendar_id: str, credentials: dict) -> None:
    """Sync events from Microsoft Graph API. Stub."""
    _LOGGER.debug("Microsoft sync stub: calendar_id=%s", calendar_id)
