from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


RECURRING_TYPES = {
    "LOAN_EMI",
    "SIP",
    "RD",
    "INSURANCE",
    "RENT",
    "SUBSCRIPTION",
    "UTILITY",
    "SALARY",
    "OTHER",
}

FREQUENCIES = {
    "WEEKLY",
    "MONTHLY",
    "QUARTERLY",
    "YEARLY",
}


class RecurringTransactionCreate(BaseModel):
    account_id: UUID
    category_id: UUID | None = None

    name: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    recurring_type: str = Field(
        ...,
        min_length=1,
        max_length=30,
    )

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

    frequency: str = Field(
        ...,
        min_length=1,
        max_length=20,
    )

    start_date: date

    end_date: date | None = None

    next_occurrence: date

    merchant: str | None = Field(
        default=None,
        max_length=150,
    )

    description: str | None = Field(
        default=None,
        max_length=255,
    )

    notes: str | None = None

    @model_validator(mode="after")
    def validate_schedule(self):
        if self.recurring_type not in RECURRING_TYPES:
            raise ValueError(
                "Invalid recurring transaction type."
            )

        if self.frequency not in FREQUENCIES:
            raise ValueError(
                "Invalid recurring transaction frequency."
            )

        if self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError(
                    "End date cannot be before start date."
                )

        if self.next_occurrence < self.start_date:
            raise ValueError(
                "Next occurrence cannot be before start date."
            )

        if (
            self.end_date is not None
            and self.next_occurrence > self.end_date
        ):
            raise ValueError(
                "Next occurrence cannot be after end date."
            )

        return self


class RecurringTransactionUpdate(BaseModel):
    account_id: UUID | None = None
    category_id: UUID | None = None

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    recurring_type: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
    )

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

    frequency: str | None = Field(
        default=None,
        min_length=1,
        max_length=20,
    )

    start_date: date | None = None

    end_date: date | None = None

    next_occurrence: date | None = None

    merchant: str | None = Field(
        default=None,
        max_length=150,
    )

    description: str | None = Field(
        default=None,
        max_length=255,
    )

    notes: str | None = None

    is_active: bool | None = None


class RecurringTransactionResponse(BaseModel):
    id: UUID
    user_id: UUID

    account_id: UUID
    account_name: str
    account_institution_name: str | None = None

    category_id: UUID | None
    category_name: str | None = None

    name: str
    recurring_type: str
    transaction_type: str

    amount: Decimal

    frequency: str

    start_date: date
    end_date: date | None

    next_occurrence: date
    last_generated_date: date | None

    merchant: str | None
    description: str | None
    notes: str | None

    is_active: bool

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class RecurringTransactionListResponse(BaseModel):
    items: list[RecurringTransactionResponse]
    total: int

class RecurringTransactionGenerateResponse(BaseModel):
    recurring_transaction_id: UUID
    generated_transaction_id: UUID
    generated_transaction_date: date
    generated_amount: Decimal
    next_occurrence: date
    is_active: bool

class RecurringTransactionProcessDueItem(BaseModel):
    recurring_transaction_id: UUID
    generated_transaction_id: UUID
    generated_transaction_date: date
    generated_amount: Decimal
    next_occurrence: date
    is_active: bool


class RecurringTransactionProcessDueResponse(BaseModel):
    processing_date: date
    processed_rules: int
    generated_transactions: int
    skipped_rules: int
    items: list[RecurringTransactionProcessDueItem]