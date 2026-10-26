from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import UUID

import app.services.financial_context as financial_context


def test_financial_context_includes_current_month_budget(monkeypatch):
    db = MagicMock()
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    today = date(2026, 10, 26)

    monkeypatch.setattr(
        financial_context,
        "get_income_expense_summary",
        lambda **kwargs: {
            "income": Decimal("50000.00"),
            "expense": Decimal("12000.00"),
            "net": Decimal("38000.00"),
        },
    )
    monkeypatch.setattr(
        financial_context,
        "get_expenses_by_category",
        lambda **kwargs: {
            "items": [
                {
                    "category_name": "Groceries",
                    "amount": Decimal("4000.00"),
                    "percentage": Decimal("33.33"),
                }
            ]
        },
    )
    monkeypatch.setattr(
        financial_context,
        "list_budgets",
        lambda **kwargs: (
            [
                {
                    "name": "Groceries",
                    "category_name": "Groceries",
                    "month_start": date(2026, 10, 1),
                    "month_end": date(2026, 10, 31),
                    "amount": Decimal("15000.00"),
                    "spent": Decimal("4000.00"),
                    "remaining": Decimal("11000.00"),
                    "percentage_used": Decimal("26.67"),
                    "safe_daily_spend": Decimal("2200.00"),
                    "days_remaining": 5,
                    "projected_spend": Decimal("4800.00"),
                    "status": "ON_TRACK",
                    "insight": "You can spend about ₹2,200 per day.",
                }
            ],
            1,
        ),
    )

    context = financial_context.build_financial_context(
        db=db,
        user_id=user_id,
        today=today,
    )

    assert context["current_month_budgets"] == [
        {
            "budget_name": "Groceries",
            "category": "Groceries",
            "period_start": "2026-10-01",
            "period_end": "2026-10-31",
            "budget_amount_in_inr": "15000.00",
            "spent_in_inr": "4000.00",
            "remaining_in_inr": "11000.00",
            "percentage_used": "26.67",
            "safe_daily_spend_in_inr": "2200.00",
            "days_remaining": 5,
            "projected_spend_in_inr": "4800.00",
            "status": "ON_TRACK",
            "insight": "You can spend about ₹2,200 per day.",
        }
    ]
    assert context["current_month"]["recorded_expenses_in_inr"] == "12000.00"
