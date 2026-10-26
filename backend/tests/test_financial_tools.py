import json
from decimal import Decimal
from unittest.mock import MagicMock

from app.services.financial_tools import execute_financial_tool


class EmptyQuery:
    """Minimal SQLAlchemy query double for transaction-search edge cases."""

    def join(self, *args, **kwargs):
        return self

    def outerjoin(self, *args, **kwargs):
        return self

    def filter(self, *args, **kwargs):
        return self

    def count(self):
        return 0

    def group_by(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def all(self):
        return []


def _db():
    db = MagicMock()
    db.query.return_value = EmptyQuery()
    return db


def _search(db, **overrides):
    arguments = {
        "start_date": None,
        "end_date": None,
        "transaction_type": None,
        "search": None,
        "limit": 20,
    }
    arguments.update(overrides)
    return json.loads(
        execute_financial_tool(
            db=db,
            user_id="00000000-0000-0000-0000-000000000001",
            tool_name="search_transactions",
            arguments_json=json.dumps(arguments),
        )
    )


def test_transaction_search_returns_explicit_empty_result():
    result = _search(_db())

    assert result["total_matching_transactions"] == 0
    assert result["returned_transactions"] == 0
    assert result["transactions"] == []
    assert result["truncated"] is False


def test_transaction_search_rejects_start_date_after_end_date():
    result = _search(
        _db(),
        start_date="2026-10-10",
        end_date="2026-10-01",
    )

    assert result == {"error": "start_date must be on or before end_date."}


def test_transaction_search_rejects_invalid_date_format():
    result = _search(_db(), start_date="10-01-2026")

    assert result == {"error": "start_date must use YYYY-MM-DD format."}


def test_transaction_search_caps_limit_at_fifty():
    db = _db()

    result = _search(db, limit=500)

    assert result["limit"] == 50
    assert result["returned_transactions"] == 0



class RowsQuery(EmptyQuery):
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


def _summary(db, **overrides):
    arguments = {
        "start_date": None,
        "end_date": None,
        "transaction_type": None,
        "search": None,
    }
    arguments.update(overrides)
    return json.loads(
        execute_financial_tool(
            db=db,
            user_id="00000000-0000-0000-0000-000000000001",
            tool_name="summarize_transactions",
            arguments_json=json.dumps(arguments),
        )
    )


def test_transaction_summary_returns_explicit_empty_aggregate():
    result = _summary(_db())

    assert result["total_matching_transactions"] == 0
    assert result["totals_by_currency"] == []
    assert "calculated by the database" in result["note"]


def test_transaction_summary_keeps_currency_totals_separate():
    db = _db()
    db.query.return_value = RowsQuery([
        ("INR", 2, Decimal("18000.00")),
        ("USD", 1, Decimal("25.00")),
    ])

    result = _summary(
        db,
        transaction_type="EXPENSE",
        search="EMI",
    )

    assert result["total_matching_transactions"] == 3
    assert result["totals_by_currency"] == [
        {
            "currency": "INR",
            "transaction_count": 2,
            "amount_total": "18000.00",
        },
        {
            "currency": "USD",
            "transaction_count": 1,
            "amount_total": "25.00",
        },
    ]


def test_transaction_summary_rejects_invalid_date_range():
    result = _summary(
        _db(),
        start_date="2026-10-10",
        end_date="2026-10-01",
    )

    assert result == {"error": "start_date must be on or before end_date."}


def test_transaction_summary_rejects_invalid_transaction_type():
    result = _summary(_db(), transaction_type="TRANSFER")

    assert result == {"error": "transaction_type must be INCOME or EXPENSE."}
