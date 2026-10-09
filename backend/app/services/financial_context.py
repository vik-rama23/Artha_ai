from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.services.analytics import (
    get_expenses_by_category,
    get_income_expense_summary,
)


def _money(value: Decimal | None) -> str:
    return str(value if value is not None else Decimal("0.00"))


def _month_end(value: date) -> date:
    return date(
        value.year,
        value.month,
        monthrange(value.year, value.month)[1],
    )


def build_financial_context(
    db: Session,
    user_id: UUID,
    today: date | None = None,
) -> dict:
    """
    Build a small, deterministic context for the AI assistant.

    Only aggregate figures for the authenticated user are included.
    Raw transaction descriptions, account identifiers, and credentials
    are deliberately not sent to the model.
    """
    snapshot_date = today or date.today()
    current_month_start = snapshot_date.replace(day=1)
    previous_month_end = current_month_start - timedelta(days=1)
    previous_month_start = previous_month_end.replace(day=1)

    current_summary = get_income_expense_summary(
        db=db,
        user_id=user_id,
        start_date=current_month_start,
        end_date=snapshot_date,
    )
    previous_summary = get_income_expense_summary(
        db=db,
        user_id=user_id,
        start_date=previous_month_start,
        end_date=previous_month_end,
    )
    category_result = get_expenses_by_category(
        db=db,
        user_id=user_id,
        start_date=current_month_start,
        end_date=snapshot_date,
    )

    top_categories = [
        {
            "category": item["category_name"],
            "expense_in_inr": _money(item["amount"]),
            "share_of_recorded_expenses_percent": str(
                item["percentage"]
            ),
        }
        for item in category_result["items"][:5]
    ]

    return {
        "currency": "INR",
        "data_through": snapshot_date.isoformat(),
        "current_month": {
            "period_start": current_month_start.isoformat(),
            "period_end": snapshot_date.isoformat(),
            "recorded_income_in_inr": _money(
                current_summary["income"]
            ),
            "recorded_expenses_in_inr": _money(
                current_summary["expense"]
            ),
            "net_cash_flow_in_inr": _money(
                current_summary["net"]
            ),
            "top_expense_categories": top_categories,
        },
        "previous_completed_month": {
            "period_start": previous_month_start.isoformat(),
            "period_end": previous_month_end.isoformat(),
            "recorded_income_in_inr": _money(
                previous_summary["income"]
            ),
            "recorded_expenses_in_inr": _money(
                previous_summary["expense"]
            ),
            "net_cash_flow_in_inr": _money(
                previous_summary["net"]
            ),
        },
        "limitations": [
            "Figures reflect transactions recorded in Artha, not necessarily every real-world transaction.",
            "The context contains current-month-to-date and previous-completed-month aggregates only.",
            "Account balances, individual transactions, budgets, goals, and net worth are not included in this first version.",
            "Do not infer missing values or claim to have checked data that is not present.",
        ],
    }
