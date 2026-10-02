from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class DashboardCategoryItem(BaseModel):
    category_id: UUID | None
    category_name: str
    amount: Decimal
    percentage: Decimal


class DashboardMonthlyItem(BaseModel):
    month: str
    income: Decimal
    expense: Decimal
    net: Decimal


class DashboardTransactionItem(BaseModel):
    id: UUID
    account_id: UUID
    category_id: UUID | None

    transaction_type: str
    amount: Decimal
    transaction_date: date

    description: str | None
    merchant: str | None
    notes: str | None

    account_name: str
    account_institution_name: str | None
    category_name: str | None


class DashboardResponse(BaseModel):
    user_id: UUID

    balance: Decimal

    income: Decimal
    expense: Decimal
    net: Decimal

    start_date: date | None
    end_date: date | None

    expenses_by_category: list[DashboardCategoryItem]

    monthly_cash_flow: list[DashboardMonthlyItem]

    recent_transactions: list[DashboardTransactionItem]