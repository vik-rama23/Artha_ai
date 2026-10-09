from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.services.analytics import (
    get_expenses_by_category,
    get_income_expense_summary,
)
from app.services.budgets import list_budgets


def _money(value: Decimal | None) -> str:
    return str(value if value is not None else Decimal("0.00"))


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

    # Reuse Artha's budget service so the AI receives the same calculated
    # amounts that the Budgets page displays (spent, remaining, safe daily spend).
    current_budgets, _ = list_budgets(
        db=db,
        user_id=user_id,
        month_start=snapshot_date,
    )

    budget_context = [
        {
            "budget_name": item["name"],
            "category": item["category_name"] or item["name"],
            "period_start": item["month_start"].isoformat(),
            "period_end": item["month_end"].isoformat(),
            "budget_amount_in_inr": _money(item["amount"]),
            "spent_in_inr": _money(item["spent"]),
            "remaining_in_inr": _money(item["remaining"]),
            "percentage_used": str(item["percentage_used"]),
            "safe_daily_spend_in_inr": _money(item["safe_daily_spend"]),
            "days_remaining": item["days_remaining"],
            "projected_spend_in_inr": (
                _money(item["projected_spend"])
                if item["projected_spend"] is not None
                else None
            ),
            "status": item["status"],
            "insight": item["insight"],
        }
        for item in current_budgets
    ]

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
        "current_month_budgets": budget_context,
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
            "Detailed account balances, transaction records, goals, net worth, and recurring transactions are available through authenticated read-only assistant tools when needed.",
            "Current-month budget details are included separately in current_month_budgets. An empty list means no budget is configured for this month.",
            "Do not infer missing values or claim to have checked data that is not present.",
        ],
    }
