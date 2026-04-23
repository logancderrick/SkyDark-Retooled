"""HTTP views for serving Skydark photos directly.

HA's `/media/local/...` route depends on `media_dirs` being configured exactly
as the frontend expects, which is fragile (empty cards, 401/404 cascades).
This view serves photo bytes straight from the managed Calendar Images folder
using the same auth pipeline as our WebSocket commands, so tokens that already
work for the panel also work for photo images.
"""

from __future__ import annotations

import logging
from urllib.parse import unquote, urlparse

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .photo_media import CALENDAR_MEDIA_FOLDER, get_calendar_media_dir

_WARN_MISSING = "skydark photo %s: %s (raw=%r media_dir=%s filename=%r)"

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

        media_dir = await hass.async_add_executor_job(get_calendar_media_dir, hass)
        filename = _extract_filename(raw_path)
        if not filename:
            _LOGGER.warning(
                _WARN_MISSING, photo_id, "filename not extractable",
                raw_path, media_dir, filename,
            )
            return web.Response(status=404)

        candidate = (media_dir / filename).resolve()
        try:
            inside_media_dir = candidate.is_relative_to(media_dir)
        except (ValueError, OSError):
            inside_media_dir = False
        if not inside_media_dir:
            _LOGGER.warning(
                _WARN_MISSING, photo_id, "resolved path escapes media dir",
                raw_path, media_dir, filename,
            )
            return web.Response(status=404)

        exists = await hass.async_add_executor_job(candidate.is_file)
        if not exists:
            _LOGGER.warning(
                _WARN_MISSING, photo_id, f"file not found at {candidate}",
                raw_path, media_dir, filename,
            )
            return web.Response(status=404)

        return web.FileResponse(candidate)


def _extract_filename(raw: str) -> str | None:
    """Pull the stored filename out of any Calendar Images path shape.

    Handles URL-encoded (``Calendar%20Images``), unencoded, query-strings,
    ``media-source://`` URLs and raw disk paths so the view works against
    every shape the DB may have ever stored.
    """
    cleaned = raw.strip().replace("\\", "/")
    if not cleaned:
        return None

    path_only = cleaned.split("?", 1)[0]
    parsed = urlparse(path_only)
    candidate_path = parsed.path if parsed.scheme else path_only
    decoded = unquote(candidate_path)

    marker = f"{CALENDAR_MEDIA_FOLDER}/"
    idx = decoded.rfind(marker)
    if idx < 0:
        return None

    tail = decoded[idx + len(marker) :]
    filename = tail.split("/")[-1].strip()
    return filename or None
