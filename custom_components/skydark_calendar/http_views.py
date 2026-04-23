"""HTTP views for serving Skydark photos directly.

HA's `/media/local/...` route depends on `media_dirs` being configured exactly
as the frontend expects, which is fragile (empty cards, 401/404 cascades).
This view serves photo bytes straight from the managed Calendar Images folder
using the same auth pipeline as our WebSocket commands, so tokens that already
work for the panel also work for photo images.
"""

from __future__ import annotations

import logging
from pathlib import Path
from urllib.parse import unquote, urlparse

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .photo_media import CALENDAR_MEDIA_FOLDER, get_calendar_media_dir

_LOGGER = logging.getLogger(__name__)


class SkydarkPhotoView(HomeAssistantView):
    """Serve a stored Skydark photo by its database id."""

    url = "/api/skydark_calendar/photo/{photo_id}"
    name = "api:skydark_calendar:photo"
    requires_auth = True

    async def get(self, request: web.Request, photo_id: str) -> web.StreamResponse:
        hass: HomeAssistant = request.app["hass"]
        domain_data = hass.data.get(DOMAIN) or {}
        db = domain_data.get("db")
        if db is None:
            return web.Response(status=503, text="Skydark not ready")

        photo = await hass.async_add_executor_job(db.get_photo, photo_id)
        if not photo:
            return web.Response(status=404)

        raw_path = str(photo.get("file_path") or "")
        if not raw_path:
            return web.Response(status=404)

        resolved = await hass.async_add_executor_job(
            _resolve_photo_path, hass, raw_path
        )
        if not resolved:
            _LOGGER.debug("skydark photo %s: could not resolve %r", photo_id, raw_path)
            return web.Response(status=404)

        exists = await hass.async_add_executor_job(resolved.is_file)
        if not exists:
            _LOGGER.debug("skydark photo %s: missing %s", photo_id, resolved)
            return web.Response(status=404)

        return web.FileResponse(resolved)


def _resolve_photo_path(hass: HomeAssistant, raw: str) -> Path | None:
    """Translate any stored file_path / media URL into a real disk path."""
    cleaned = raw.strip()
    if not cleaned:
        return None

    media_dir = get_calendar_media_dir(hass)
    filename = _extract_filename(cleaned)
    if filename:
        candidate = (media_dir / filename).resolve()
        try:
            if candidate.is_relative_to(media_dir):
                return candidate
        except (ValueError, OSError):
            return None
    return None


def _extract_filename(raw: str) -> str | None:
    """Pull the stored filename out of any Calendar Images path shape."""
    normalized = raw.replace("\\", "/")
    marker = f"{CALENDAR_MEDIA_FOLDER}/"
    idx = normalized.rfind(marker)
    if idx < 0:
        return None
    tail = normalized[idx + len(marker) :]
    parsed = urlparse(tail)
    filename = unquote(parsed.path or tail)
    filename = filename.split("/")[-1]
    return filename or None
