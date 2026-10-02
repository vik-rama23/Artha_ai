from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )

    category_type: str = Field(
        pattern="^(INCOME|EXPENSE)$",
    )

    icon: str | None = Field(
        default=None,
        max_length=50,
    )


class CategoryUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    category_type: str | None = Field(
        default=None,
        pattern="^(INCOME|EXPENSE)$",
    )

    icon: str | None = Field(
        default=None,
        max_length=50,
    )

    is_active: bool | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID | None
    name: str
    category_type: str
    icon: str | None
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CategoryListResponse(BaseModel):
    items: list[CategoryResponse]
    total: int