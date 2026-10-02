from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TopTransactionItem(BaseModel):
    transaction_id: UUID
    transaction_date: date
    amount: Decimal
    merchant: str | None
    description: str | None
    category_id: UUID | None
    category_name: str
    account_id: UUID
    account_name: str


class TopTransactionsResponse(BaseModel):
    start_date: date | None
    end_date: date | None
    limit: int
    total_expense: Decimal
    items: list[TopTransactionItem]