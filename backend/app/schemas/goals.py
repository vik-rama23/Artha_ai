from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class GoalCreate(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=150,
        description="Name of the financial goal.",
    )

    description: str | None = Field(
        default=None,
        description="Optional description of the goal.",
    )

    target_amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=14,
        decimal_places=2,
        description="Target amount required to complete the goal.",
    )

    current_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        max_digits=14,
        decimal_places=2,
        description="Current amount already saved toward the goal.",
    )

    target_date: date | None = Field(
        default=None,
        description="Optional date by which the goal should be completed.",
    )

    icon: str | None = Field(
        default=None,
        max_length=100,
        description="Optional icon identifier.",
    )

    @model_validator(mode="after")
    def validate_current_amount(self):
        if self.current_amount > self.target_amount:
            raise ValueError(
                "Current amount cannot be greater than target amount."
            )

        return self


class GoalUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    description: str | None = None

    target_amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=14,
        decimal_places=2,
    )

    current_amount: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=14,
        decimal_places=2,
    )

    target_date: date | None = None

    icon: str | None = Field(
        default=None,
        max_length=100,
    )

    is_completed: bool | None = None


class GoalContributionCreate(BaseModel):
    amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=14,
        decimal_places=2,
        description="Amount being added to the goal.",
    )

    contribution_date: date = Field(
        ...,
        description="Date on which the contribution was made.",
    )

    notes: str | None = Field(
        default=None,
        description="Optional contribution notes.",
    )


class GoalContributionResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    goal_id: UUID
    amount: Decimal
    contribution_date: date
    notes: str | None
    created_at: datetime


class GoalResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    user_id: UUID
    name: str
    description: str | None
    target_amount: Decimal
    current_amount: Decimal
    target_date: date | None
    icon: str | None
    is_completed: bool
    created_at: datetime
    updated_at: datetime


class GoalDetailResponse(GoalResponse):
    contributions: list[GoalContributionResponse] = Field(
        default_factory=list,
    )


class GoalListResponse(BaseModel):
    items: list[GoalResponse]
    total: int


class GoalContributionListResponse(BaseModel):
    items: list[GoalContributionResponse]
    total: int