from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class IncomeExpenseSummaryResponse(BaseModel):
    user_id: UUID
    start_date: date | None
    end_date: date | None
    income: Decimal
    expense: Decimal
    net: Decimal


class ExpenseByCategoryItem(BaseModel):
    category_id: UUID | None
    category_name: str
    amount: Decimal
    percentage: Decimal


class ExpenseByCategoryResponse(BaseModel):
    start_date: date | None
    end_date: date | None
    total_expense: Decimal
    items: list[ExpenseByCategoryItem]


class MonthlyCashFlowItem(BaseModel):
    month: str
    income: Decimal
    expense: Decimal
    net: Decimal


class MonthlyCashFlowResponse(BaseModel):
    start_date: date | None
    end_date: date | None
    items: list[MonthlyCashFlowItem]


class AnalyticsPeriod(BaseModel):
    start_date: date
    end_date: date
    income: Decimal
    expense: Decimal
    net: Decimal


class AnalyticsMetricChange(BaseModel):
    current: Decimal
    previous: Decimal
    change: Decimal
    change_percentage: Decimal | None


class AnalyticsComparisonResponse(BaseModel):
    current_period: AnalyticsPeriod
    previous_period: AnalyticsPeriod
    income: AnalyticsMetricChange
    expense: AnalyticsMetricChange
    net: AnalyticsMetricChange


class CategoryTrendItem(BaseModel):
    category_id: UUID | None
    category_name: str
    current_amount: Decimal
    previous_amount: Decimal
    change: Decimal
    change_percentage: Decimal | None
    current_percentage: Decimal


class CategoryTrendsResponse(BaseModel):
    current_period_start_date: date
    current_period_end_date: date
    previous_period_start_date: date
    previous_period_end_date: date
    total_current_expense: Decimal
    total_previous_expense: Decimal
    items: list[CategoryTrendItem]


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


class SavingsTrendItem(BaseModel):
    month: str
    income: Decimal
    expense: Decimal
    savings: Decimal
    savings_rate: Decimal


class SavingsTrendResponse(BaseModel):
    start_date: date | None
    end_date: date | None
    total_income: Decimal
    total_expense: Decimal
    total_savings: Decimal
    average_savings_rate: Decimal
    items: list[SavingsTrendItem]


class AnalyticsInsight(BaseModel):
    type: str
    title: str
    message: str
    value: Decimal | None = None
    percentage: Decimal | None = None


class AnalyticsInsightsResponse(BaseModel):
    start_date: date | None
    end_date: date | None

    income: Decimal
    expense: Decimal
    savings: Decimal
    savings_rate: Decimal

    insights: list[AnalyticsInsight]