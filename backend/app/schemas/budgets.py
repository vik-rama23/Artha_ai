from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class BudgetCreate(BaseModel):
    category_id: UUID | None = None

    name: str = Field(
        min_length=1,
        max_length=100,
    )

    month_start: date

    amount: Decimal = Field(
        gt=0,
        max_digits=15,
        decimal_places=2,
    )

    warning_percentage: Decimal = Field(
        default=Decimal("80.00"),
        gt=0,
        le=100,
        max_digits=5,
        decimal_places=2,
    )


class BudgetUpdate(BaseModel):
    category_id: UUID | None = None

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    month_start: date | None = None

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=15,
        decimal_places=2,
    )

    warning_percentage: Decimal | None = Field(
        default=None,
        gt=0,
        le=100,
        max_digits=5,
        decimal_places=2,
    )


class BudgetResponse(BaseModel):
    id: UUID
    user_id: UUID

    category_id: UUID | None
    category_name: str | None

    name: str

    month_start: date
    month_end: date

    amount: Decimal
    spent: Decimal
    remaining: Decimal

    percentage_used: Decimal
    warning_percentage: Decimal

    projected_spend: Decimal | None
    projected_overspend: Decimal
    days_remaining: int
    daily_spend_rate: Decimal
    safe_daily_spend: Decimal
    insight: str

    status: str

    created_at: str
    updated_at: str


class BudgetListResponse(BaseModel):
    items: list[BudgetResponse]
    total: int