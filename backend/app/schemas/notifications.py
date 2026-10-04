from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID

    type: str
    title: str
    message: str
    priority: str

    is_read: bool

    reference_type: str | None
    reference_id: UUID | None

    scheduled_for: datetime | None
    created_at: datetime
    read_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True,
    )


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationListQuery(BaseModel):
    is_read: bool | None = None
    limit: int = Field(
        default=50,
        ge=1,
        le=100,
    )
