import json
import logging
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.accounts import Account
from app.models.categories import Category
from app.models.goals import Goal
from app.models.recurring_transactions import RecurringTransaction
from app.models.transactions import Transaction
from app.services.accounts import get_account_balance
from app.services.budgets import list_budgets
from app.services.net_worth import get_net_worth
from app.services.recurring_transactions import get_recurring_transaction_list

logger = logging.getLogger("artha.financial_tools")

MAX_TRANSACTION_RESULTS = 50


def _json_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (date,)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    return value


def _serialize(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _serialize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialize(item) for item in value]
    return _json_value(value)


def _account_data(db: Session, user_id: UUID) -> dict:
    accounts = (
        db.query(Account)
        .filter(Account.user_id == user_id)
        .order_by(Account.created_at.desc())
        .all()
    )
    items = []
    for account in accounts:
        items.append({
            "name": account.name,
            "account_type": account.account_type,
            "institution": account.institution_name,
            "account_number_last4": account.account_number_last4,
            "currency": account.currency,
            "opening_balance": _json_value(account.opening_balance),
            "opening_balance_date": account.opening_balance_date.isoformat(),
            "current_balance": _json_value(
                get_account_balance(db, account.id, date.today())
            ),
        })
    return {
        "as_of_date": date.today().isoformat(),
        "currency_note": "Balances are shown in each account's recorded currency; do not sum different currencies without conversion.",
        "total_accounts": len(items),
        "accounts": items,
    }


def _transaction_data(
    db: Session,
    user_id: UUID,
    start_date: str | None = None,
    end_date: str | None = None,
    transaction_type: str | None = None,
    search: str | None = None,
    limit: int = 20,
) -> dict:
    query = (
        db.query(Transaction, Account.name, Category.name)
        .join(Account, Account.id == Transaction.account_id)
        .outerjoin(Category, Category.id == Transaction.category_id)
        .filter(
            Transaction.user_id == user_id,
            Account.user_id == user_id,
        )
    )

    if start_date:
        try:
            parsed_start = date.fromisoformat(start_date)
        except ValueError as exc:
            raise ValueError("start_date must use YYYY-MM-DD format.") from exc
        query = query.filter(Transaction.transaction_date >= parsed_start)

    if end_date:
        try:
            parsed_end = date.fromisoformat(end_date)
        except ValueError as exc:
            raise ValueError("end_date must use YYYY-MM-DD format.") from exc
        query = query.filter(Transaction.transaction_date <= parsed_end)

    if transaction_type:
        normalized_type = transaction_type.upper()
        if normalized_type not in {"INCOME", "EXPENSE"}:
            raise ValueError("transaction_type must be INCOME or EXPENSE.")
        query = query.filter(Transaction.transaction_type == normalized_type)

    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.filter(
            Transaction.description.ilike(pattern)
            | Transaction.merchant.ilike(pattern)
            | Category.name.ilike(pattern)
        )

    total = query.count()
    bounded_limit = max(1, min(int(limit), MAX_TRANSACTION_RESULTS))
    rows = (
        query.order_by(
            Transaction.transaction_date.desc(),
            Transaction.created_at.desc(),
        )
        .limit(bounded_limit)
        .all()
    )

    items = []
    for transaction, account_name, category_name in rows:
        items.append({
            "date": transaction.transaction_date.isoformat(),
            "type": transaction.transaction_type,
            "amount": _json_value(transaction.amount),
            "currency": "account currency",
            "account": account_name,
            "category": category_name,
            "merchant": transaction.merchant,
            "description": transaction.description,
        })

    return {
        "total_matching_transactions": total,
        "returned_transactions": len(items),
        "limit": bounded_limit,
        "truncated": total > len(items),
        "transactions": items,
    }


def _budget_data(db: Session, user_id: UUID, month_start: str | None = None) -> dict:
    parsed_month = None
    if month_start:
        try:
            parsed_month = date.fromisoformat(month_start)
        except ValueError as exc:
            raise ValueError("month_start must use YYYY-MM-DD format.") from exc
    budgets, total = list_budgets(
        db=db,
        user_id=user_id,
        month_start=parsed_month or date.today(),
    )
    return {
        "month": (parsed_month or date.today()).replace(day=1).isoformat(),
        "total_budgets": total,
        "budgets": [
            {
                "name": item["name"],
                "category": item["category_name"] or item["name"],
                "period_start": item["month_start"],
                "period_end": item["month_end"],
                "amount": item["amount"],
                "spent": item["spent"],
                "remaining": item["remaining"],
                "percentage_used": item["percentage_used"],
                "safe_daily_spend": item["safe_daily_spend"],
                "days_remaining": item["days_remaining"],
                "projected_spend": item["projected_spend"],
                "status": item["status"],
                "insight": item["insight"],
            }
            for item in budgets
        ],
    }


def _goal_data(db: Session, user_id: UUID) -> dict:
    goals = (
        db.query(Goal)
        .filter(Goal.user_id == user_id)
        .order_by(Goal.is_completed.asc(), Goal.target_date.asc().nulls_last())
        .all()
    )
    return {
        "total_goals": len(goals),
        "goals": [
            {
                "name": goal.name,
                "description": goal.description,
                "target_amount": _json_value(goal.target_amount),
                "current_amount": _json_value(goal.current_amount),
                "remaining_amount": _json_value(max(
                    goal.target_amount - goal.current_amount, Decimal("0.00")
                )),
                "target_date": goal.target_date.isoformat() if goal.target_date else None,
                "is_completed": goal.is_completed,
            }
            for goal in goals
        ],
    }


def _net_worth_data(db: Session, user_id: UUID, as_of_date: str | None = None) -> dict:
    parsed_date = date.today()
    if as_of_date:
        try:
            parsed_date = date.fromisoformat(as_of_date)
        except ValueError as exc:
            raise ValueError("as_of_date must use YYYY-MM-DD format.") from exc
    snapshot = get_net_worth(db=db, user_id=user_id, as_of_date=parsed_date)
    return {
        "as_of_date": snapshot["as_of_date"],
        "total_assets": snapshot["total_assets"],
        "total_liabilities": snapshot["total_liabilities"],
        "net_worth": snapshot["net_worth"],
        "asset_change_vs_previous_month": snapshot["asset_change"],
        "liability_change_vs_previous_month": snapshot["liability_change"],
        "net_worth_change_vs_previous_month": snapshot["net_worth_change"],
        "assets": snapshot["asset_items"],
        "liabilities": snapshot["liability_items"],
    }


def _recurring_data(db: Session, user_id: UUID, active_only: bool = False) -> dict:
    rows, total = get_recurring_transaction_list(
        db=db,
        user_id=user_id,
        active_only=active_only,
    )
    items = []
    for row in rows:
        recurring = row[0]
        items.append({
            "name": recurring.name,
            "type": recurring.recurring_type,
            "transaction_type": recurring.transaction_type,
            "amount": _json_value(recurring.amount),
            "frequency": recurring.frequency,
            "start_date": recurring.start_date.isoformat(),
            "end_date": recurring.end_date.isoformat() if recurring.end_date else None,
            "next_occurrence": recurring.next_occurrence.isoformat(),
            "is_active": recurring.is_active,
            "account": row.account_name,
            "category": row.category_name,
            "merchant": recurring.merchant,
            "description": recurring.description,
        })
    return {"total_recurring_items": total, "items": items}


FINANCIAL_TOOLS = [
    {
        "type": "function",
        "name": "get_accounts",
        "description": "Read the authenticated user's financial accounts and calculated current balances.",
        "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
        "strict": True,
    },
    {
        "type": "function",
        "name": "search_transactions",
        "description": "Search the authenticated user's transactions. Use date filters for a period and search for a merchant/category-related keyword. Results are capped at 50; check truncated and total_matching_transactions.",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {"type": ["string", "null"], "description": "Inclusive date YYYY-MM-DD, or null."},
                "end_date": {"type": ["string", "null"], "description": "Inclusive date YYYY-MM-DD, or null."},
                "transaction_type": {"type": ["string", "null"], "enum": ["INCOME", "EXPENSE", None], "description": "INCOME, EXPENSE, or null."},
                "search": {"type": ["string", "null"], "description": "Optional keyword matched against transaction merchant or description."},
                "limit": {"type": "integer", "minimum": 1, "maximum": 50},
            },
            "required": ["start_date", "end_date", "transaction_type", "search", "limit"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_budgets",
        "description": "Read the authenticated user's budgets for a month, including amount, spent, remaining, safe daily spend and status. Defaults to the current month.",
        "parameters": {
            "type": "object",
            "properties": {"month_start": {"type": ["string", "null"], "description": "Any date in the desired month as YYYY-MM-DD, or null for current month."}},
            "required": ["month_start"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_goals",
        "description": "Read the authenticated user's financial goals and progress.",
        "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_net_worth",
        "description": "Read the authenticated user's net worth, assets and liabilities for a date. Defaults to today.",
        "parameters": {
            "type": "object",
            "properties": {"as_of_date": {"type": ["string", "null"], "description": "Snapshot date YYYY-MM-DD, or null for today."}},
            "required": ["as_of_date"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_recurring_transactions",
        "description": "Read the authenticated user's recurring income and expenses.",
        "parameters": {
            "type": "object",
            "properties": {"active_only": {"type": "boolean"},
            },
            "required": ["active_only"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]


def execute_financial_tool(
    db: Session,
    user_id: UUID,
    tool_name: str,
    arguments_json: str,
) -> str:
    """Execute an allow-listed read-only tool, always scoped to the authenticated user."""
    try:
        arguments = json.loads(arguments_json or "{}")
        if not isinstance(arguments, dict):
            raise ValueError("Tool arguments must be a JSON object.")

        if tool_name == "get_accounts":
            result = _account_data(db, user_id)
        elif tool_name == "search_transactions":
            result = _transaction_data(db, user_id, **arguments)
        elif tool_name == "get_budgets":
            result = _budget_data(db, user_id, **arguments)
        elif tool_name == "get_goals":
            result = _goal_data(db, user_id)
        elif tool_name == "get_net_worth":
            result = _net_worth_data(db, user_id, **arguments)
        elif tool_name == "get_recurring_transactions":
            result = _recurring_data(db, user_id, **arguments)
        else:
            raise ValueError("This financial tool is not available.")

        return json.dumps(_serialize(result), ensure_ascii=False)
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        return json.dumps({"error": str(exc)}, ensure_ascii=False)
    except Exception:
        logger.exception("Financial tool %s failed.", tool_name)
        return json.dumps(
            {"error": "The requested financial data could not be retrieved."},
            ensure_ascii=False,
        )
