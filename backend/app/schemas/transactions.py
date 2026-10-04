from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TransactionCreate(BaseModel):
    account_id: UUID
    category_id: UUID | None = None

    transaction_type: str = Field(
        ...,
        pattern="^(INCOME|EXPENSE)$",
    )

    amount: Decimal = Field(
        ...,
        gt=0,
        decimal_places=2,
        max_digits=15,
    )

    transaction_date: date

    description: str | None = Field(
        default=None,
        max_length=255,
    )

    merchant: str | None = Field(
        default=None,
        max_length=150,
    )

    notes: str | None = None


class TransactionUpdate(BaseModel):
    account_id: UUID | None = None
    category_id: UUID | None = None

    transaction_type: str | None = Field(
        default=None,
        pattern="^(INCOME|EXPENSE)$",
    )

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        decimal_places=2,
        max_digits=15,
    )

    transaction_date: date | None = None

    description: str | None = Field(
        default=None,
        max_length=255,
    )

    merchant: str | None = Field(
        default=None,
        max_length=150,
    )

    notes: str | None = None


class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    account_id: UUID

    account_name: str
    account_institution_name: str | None = None

    category_id: UUID | None
    category_name: str

    recurring_transaction_id: UUID | None = None

    transaction_type: str
    amount: Decimal
    transaction_date: date

    description: str | None
    merchant: str | None
    notes: str | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]

    total: int
    limit: int
    offset: int