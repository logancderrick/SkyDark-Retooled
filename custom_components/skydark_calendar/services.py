"""Service handlers for Skydark Family Calendar."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from functools import partial
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

SERVICE_ADD_EVENT = "add_event"
SERVICE_COMPLETE_TASK = "complete_task"
SERVICE_ADD_POINTS = "add_points"
SERVICE_REDEEM_REWARD = "redeem_reward"
SERVICE_ADD_LIST_ITEM = "add_list_item"
SERVICE_CREATE_LIST = "create_list"
SERVICE_ADD_MEAL_RECIPE = "add_meal_recipe"
SERVICE_UPLOAD_PHOTO = "upload_photo"
SERVICE_SEND_NOTIFICATION = "send_notification"

ADD_EVENT_SCHEMA = vol.Schema(
    {
        vol.Required("title"): cv.string,
        vol.Required("start_time"): cv.datetime,
        vol.Optional("end_time"): cv.datetime,
        vol.Optional("all_day", default=False): cv.boolean,
        vol.Optional("calendar_id"): cv.string,
        vol.Optional("description"): cv.string,
        vol.Optional("location"): cv.string,
    },
    extra=vol.ALLOW_EXTRA,
)

COMPLETE_TASK_SCHEMA = vol.Schema(
    {
        vol.Required("task_id"): cv.string,
        vol.Optional("completed_date"): cv.string,
        vol.Optional("points", default=0): cv.positive_int,
    },
    extra=vol.ALLOW_EXTRA,
)

ADD_POINTS_SCHEMA = vol.Schema(
    {
        vol.Required("member_id"): cv.string,
        vol.Required("points"): int,
        vol.Required("reason"): cv.string,
        vol.Optional("task_id"): cv.string,
    },
    extra=vol.ALLOW_EXTRA,
)

REDEEM_REWARD_SCHEMA = vol.Schema(
    {
        vol.Required("member_id"): cv.string,
        vol.Required("reward_id"): cv.string,
    },
    extra=vol.ALLOW_EXTRA,
)

CREATE_LIST_SCHEMA = vol.Schema(
    {
        vol.Required("name"): cv.string,
        vol.Optional("color"): cv.string,
        vol.Optional("owner_id"): cv.string,
        vol.Optional("list_type", default="general"): cv.string,
    },
    extra=vol.ALLOW_EXTRA,
)

ADD_MEAL_RECIPE_SCHEMA = vol.Schema(
    {
        vol.Required("name"): cv.string,
        vol.Optional("ingredients", default=[]): vol.All(
            cv.ensure_list,
            [
                vol.Schema(
                    {
                        vol.Required("name"): cv.string,
                        vol.Optional("quantity", default=""): cv.string,
                        vol.Optional("unit", default=""): cv.string,
                    }
                )
            ],
        ),
    },
    extra=vol.ALLOW_EXTRA,
)

UPLOAD_PHOTO_SCHEMA = vol.Schema(
    {
        vol.Required("file_path"): cv.string,
        vol.Optional("caption"): cv.string,
        vol.Optional("uploaded_by"): cv.string,
    },
    extra=vol.ALLOW_EXTRA,
)

ADD_LIST_ITEM_SCHEMA = vol.Schema(
    {
        vol.Required("list_id"): cv.string,
        vol.Required("content"): cv.string,
    },
    extra=vol.ALLOW_EXTRA,
)

SEND_NOTIFICATION_SCHEMA = vol.Schema(
    {
        vol.Required("message"): cv.string,
        vol.Optional("title"): cv.string,
    },
    extra=vol.ALLOW_EXTRA,
)


async def async_setup_services(hass: HomeAssistant) -> None:
    """Register Skydark Calendar services."""

    async def add_event(call: ServiceCall) -> None:
        """Add a calendar event."""
        if DOMAIN not in hass.data:
            return
        db = hass.data[DOMAIN].get("db")
        if not db:
            _LOGGER.warning("Database not ready")
            return
        start = call.data["start_time"]
        if isinstance(start, str):
            start = datetime.fromisoformat(start.replace("Z", "+00:00"))
        end = call.data.get("end_time")
        if end is not None and isinstance(end, str):
            end = datetime.fromisoformat(end.replace("Z", "+00:00"))
        try:
            event_id = await hass.async_add_executor_job(
                partial(
                    db.add_event,
                    title=call.data["title"],
                    start_time=start,
                    end_time=end,
                    all_day=call.data.get("all_day", False),
                    calendar_id=call.data.get("calendar_id"),
                    description=call.data.get("description"),
                    location=call.data.get("location"),
                )
            )
            hass.bus.async_fire(
                "skydark_calendar_event_created",
                {"event_id": event_id, "title": call.data["title"]},
            )
        except Exception as e:
            _LOGGER.exception("add_event failed: %s", e)

    async def complete_task(call: ServiceCall) -> None:
        """Mark a task complete and optionally award points."""
        if DOMAIN not in hass.data:
            return
        db = hass.data[DOMAIN].get("db")
        if not db:
            _LOGGER.warning("Database not ready")
            return
        try:
            task_id = call.data["task_id"]
            completed_date_str = call.data.get("completed_date")
            points = call.data.get("points", 0)

            parsed_date = None
            if completed_date_str:
                try:
                    parsed_date = datetime.fromisoformat(
                        completed_date_str.replace("Z", "+00:00")
                    )
                except ValueError:
                    _LOGGER.warning(
                        "Invalid completed_date '%s', using current time",
                        completed_date_str,
                    )

            await hass.async_add_executor_job(
                partial(db.complete_task, task_id, parsed_date)
            )
            if points > 0:
                task = await hass.async_add_executor_job(db.get_task, task_id)
                if task:
                    await hass.async_add_executor_job(
                        partial(
                            db.add_points,
                            task["assignee_id"],
                            points,
                            "Task completed",
                            task_id=task_id,
                        )
                    )
        except Exception as e:
            _LOGGER.exception("complete_task failed: %s", e)

    async def add_points(call: ServiceCall) -> None:
        """Award points to a family member."""
        if DOMAIN not in hass.data:
            return
        db = hass.data[DOMAIN].get("db")
        if not db:
            return
        try:
            await hass.async_add_executor_job(
                partial(
                    db.add_points,
                    member_id=call.data["member_id"],
                    points=call.data["points"],
                    reason=call.data["reason"],
                    task_id=call.data.get("task_id"),
                )
            )
        except Exception as e:
            _LOGGER.exception("add_points failed: %s", e)

    async def redeem_reward(call: ServiceCall) -> None:
        """Deduct points and redeem a reward for a member."""
        if DOMAIN not in hass.data:
            return
        db = hass.data[DOMAIN].get("db")
        if not db:
            return
        try:
            ok = await hass.async_add_executor_job(
                db.redeem_reward,
                call.data["member_id"],
                call.data["reward_id"],
            )
            if not ok:
                _LOGGER.warning("redeem_reward: insufficient points or invalid reward")
        except Exception as e:
            _LOGGER.exception("redeem_reward failed: %s", e)

    async def create_list(call: ServiceCall) -> None:
        """Create a new list with optional owner."""
        if DOMAIN not in hass.data:
            return
        db = hass.data[DOMAIN].get("db")
        if not db:
            return
        try:
            await hass.async_add_executor_job(
                partial(
                    db.add_list,
                    name=call.data["name"],
                    color=call.data.get("color"),
                    owner_id=call.data.get("owner_id"),
                    list_type=call.data.get("list_type", "general"),
                )
            )
        except Exception as e:
            _LOGGER.exception("create_list failed: %s", e)

    async def add_meal_recipe(call: ServiceCall) -> None:
        """Add a meal recipe with ingredients."""
        if DOMAIN not in hass.data:
            return
        db = hass.data[DOMAIN].get("db")
        if not db:
            return
        try:
            await hass.async_add_executor_job(
                partial(
                    db.add_meal_recipe,
                    name=call.data["name"],
                    ingredients=call.data.get("ingredients", []),
                )
            )
        except Exception as e:
            _LOGGER.exception("add_meal_recipe failed: %s", e)

    async def upload_photo(call: ServiceCall) -> None:
        """Register a photo (file_path already stored on disk)."""
        if DOMAIN not in hass.data:
            return
        db = hass.data[DOMAIN].get("db")
        if not db:
            return

        file_path = call.data["file_path"]

        # Validate file_path to prevent path traversal attacks
        try:
            config_dir = Path(hass.config.config_dir).resolve()
            resolved_path = Path(file_path).resolve()
            if ".." in file_path or not str(resolved_path).startswith(str(config_dir)):
                _LOGGER.warning(
                    "upload_photo: rejected file_path '%s' outside config directory",
                    file_path,
                )
                return
        except (ValueError, OSError) as e:
            _LOGGER.warning("upload_photo: invalid file_path '%s': %s", file_path, e)
            return

        try:
            await hass.async_add_executor_job(
                partial(
                    db.add_photo,
                    file_path=file_path,
                    caption=call.data.get("caption"),
                    uploaded_by=call.data.get("uploaded_by"),
                )
            )
        except Exception as e:
            _LOGGER.exception("upload_photo failed: %s", e)

    async def add_list_item(call: ServiceCall) -> None:
        """Add item to a list."""
        if DOMAIN not in hass.data:
            return
        db = hass.data[DOMAIN].get("db")
        if not db:
            return
        try:
            await hass.async_add_executor_job(
                db.add_list_item,
                call.data["list_id"],
                call.data["content"],
            )
        except Exception as e:
            _LOGGER.exception("add_list_item failed: %s", e)

    async def send_notification(call: ServiceCall) -> None:
        """Send notification to display."""
        title = call.data.get("title", "Skydark")
        message = call.data.get("message", "")
        await hass.services.async_call(
            "persistent_notification",
            "create",
            {"title": title, "message": message},
            blocking=True,
        )

    hass.services.async_register(
        DOMAIN, SERVICE_ADD_EVENT, add_event, schema=ADD_EVENT_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_COMPLETE_TASK, complete_task, schema=COMPLETE_TASK_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_ADD_POINTS, add_points, schema=ADD_POINTS_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_REDEEM_REWARD, redeem_reward, schema=REDEEM_REWARD_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_ADD_LIST_ITEM, add_list_item, schema=ADD_LIST_ITEM_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_CREATE_LIST, create_list, schema=CREATE_LIST_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_ADD_MEAL_RECIPE, add_meal_recipe, schema=ADD_MEAL_RECIPE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_UPLOAD_PHOTO, upload_photo, schema=UPLOAD_PHOTO_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SEND_NOTIFICATION, send_notification, schema=SEND_NOTIFICATION_SCHEMA
    )
