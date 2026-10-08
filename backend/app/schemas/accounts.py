from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    account_type: str = Field(min_length=1, max_length=30)
    institution_name: str | None = Field(
        default=None,
        max_length=150,
    )
    account_number_last4: str | None = Field(
        default=None,
        min_length=4,
        max_length=4,
    )
    opening_balance: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=15,
        decimal_places=2,
    )
    currency: str = Field(
        default="INR",
        min_length=3,
        max_length=3,
    )
    notes: str | None = None


class AccountUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    account_type: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
    )
    institution_name: str | None = Field(
        default=None,
        max_length=150,
    )
    account_number_last4: str | None = Field(
        default=None,
        min_length=4,
        max_length=4,
    )
    opening_balance: Decimal | None = Field(
        default=None,
        max_digits=15,
        decimal_places=2,
    )
    currency: str | None = Field(
        default=None,
        min_length=3,
        max_length=3,
    )
    notes: str | None = None


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    name: str
    account_type: str
    institution_name: str | None = None
    account_number_last4: str | None = None
    opening_balance: Decimal
    current_balance: Decimal
    currency: str
    notes: str | None = None