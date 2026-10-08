from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NetWorthItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    item_type: str = Field(pattern="^(ASSET|LIABILITY)$")
    category: str = Field(min_length=1, max_length=50)
    value: Decimal = Field(gt=0, max_digits=15, decimal_places=2)
    as_of_date: date
    history_start_date: date | None = None
    notes: str | None = None


class NetWorthItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    item_type: str | None = Field(default=None, pattern="^(ASSET|LIABILITY)$")
    category: str | None = Field(default=None, min_length=1, max_length=50)
    value: Decimal | None = Field(default=None, gt=0, max_digits=15, decimal_places=2)
    as_of_date: date | None = None
    notes: str | None = None


class NetWorthItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    name: str
    item_type: str
    category: str
    value: Decimal
    as_of_date: date
    notes: str | None = None


class NetWorthBreakdownItem(BaseModel):
    name: str
    category: str
    source: str
    value: Decimal


class NetWorthHistoryPoint(BaseModel):
    month: date
    assets: Decimal
    liabilities: Decimal
    net_worth: Decimal


class NetWorthResponse(BaseModel):
    as_of_date: date
    total_assets: Decimal
    total_liabilities: Decimal
    net_worth: Decimal
    asset_change: Decimal
    liability_change: Decimal
    net_worth_change: Decimal
    asset_items: list[NetWorthBreakdownItem]
    liability_items: list[NetWorthBreakdownItem]
    history: list[NetWorthHistoryPoint]
