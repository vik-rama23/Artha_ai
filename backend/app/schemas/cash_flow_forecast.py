from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CashFlowForecastItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    recurring_transaction_id: str
    name: str
    transaction_type: str
    amount: Decimal
    occurrence_date: date
    frequency: str


class CashFlowForecastResponse(BaseModel):
    forecast_start_date: date
    forecast_end_date: date
    days_elapsed: int
    days_remaining: int

    current_balance: Decimal

    current_month_income: Decimal
    current_month_expense: Decimal
    current_month_net: Decimal

    expected_recurring_income: Decimal
    expected_recurring_expense: Decimal
    projected_variable_expense: Decimal

    projected_income: Decimal
    projected_expense: Decimal
    projected_month_end_balance: Decimal

    average_daily_variable_expense: Decimal
    variable_expense_source: str

    status: str
    insight: str

    upcoming_items: list[CashFlowForecastItem]
