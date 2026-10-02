from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.accounts import Account
from app.models.categories import Category
from app.models.transactions import Transaction
from app.services.accounts import get_account_balance
from app.services.analytics import (
    get_expenses_by_category,
    get_income_expense_summary,
    get_monthly_cash_flow,
)


def _get_months_ago_start(
    value: date,
    months: int = 5,
) -> date:
    """
    Return the first day of the month that is
    `months` months before the month containing
    `value`.

    Example:
        October 2026 with months=5
        -> May 1, 2026
    """

    month_index = (
        value.year * 12
        + (value.month - 1)
    )

    start_index = month_index - months

    year = start_index // 12
    month = (start_index % 12) + 1

    return date(
        year,
        month,
        1,
    )


def _resolve_dashboard_periods(
    start_date: date | None,
    end_date: date | None,
) -> tuple[
    date | None,
    date | None,
    date | None,
    date | None,
]:
    """
    Resolve the periods used by the dashboard.

    Default behaviour:

    Summary:
        Current month -> today

    Monthly cash flow:
        First day of the month five months ago
        -> today

    If the API receives explicit dates, those dates
    are respected instead.
    """

    today = date.today()

    if (
        start_date is not None
        or end_date is not None
    ):
        return (
            start_date,
            end_date,
            start_date,
            end_date,
        )

    current_month_start = today.replace(
        day=1
    )

    cash_flow_start = _get_months_ago_start(
        today,
        months=5,
    )

    return (
        current_month_start,
        today,
        cash_flow_start,
        today,
    )


def get_dashboard(
    db: Session,
    user_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:

    (
        summary_start_date,
        summary_end_date,
        cash_flow_start_date,
        cash_flow_end_date,
    ) = _resolve_dashboard_periods(
        start_date=start_date,
        end_date=end_date,
    )

    # --------------------------------------------------
    # Accounts / Current Balance
    # --------------------------------------------------

    accounts = (
        db.query(Account)
        .filter(
            Account.user_id == user_id,
        )
        .all()
    )

    total_balance = Decimal("0.00")

    for account in accounts:
        balance = get_account_balance(
            db=db,
            account_id=account.id,
        )

        total_balance += balance

    # --------------------------------------------------
    # Current Month Summary
    # --------------------------------------------------

    summary = get_income_expense_summary(
        db=db,
        user_id=user_id,
        start_date=summary_start_date,
        end_date=summary_end_date,
    )

    # --------------------------------------------------
    # Expense By Category
    # --------------------------------------------------

    category_data = get_expenses_by_category(
        db=db,
        user_id=user_id,
        start_date=summary_start_date,
        end_date=summary_end_date,
    )

    # --------------------------------------------------
    # Last 6 Months Cash Flow
    # --------------------------------------------------

    monthly_data = get_monthly_cash_flow(
        db=db,
        user_id=user_id,
        start_date=cash_flow_start_date,
        end_date=cash_flow_end_date,
    )

    # --------------------------------------------------
    # Recent Transactions
    # --------------------------------------------------

    recent_query = (
        db.query(
            Transaction,
            Account.name.label("account_name"),
            Account.institution_name.label(
                "account_institution_name"
            ),
            Category.name.label("category_name"),
        )
        .join(
            Account,
            Account.id == Transaction.account_id,
        )
        .outerjoin(
            Category,
            Category.id == Transaction.category_id,
        )
        .filter(
            Transaction.user_id == user_id,
            Account.user_id == user_id,
        )
    )

    # Explicit filters should apply to recent
    # transactions.

    if start_date is not None:
        recent_query = recent_query.filter(
            Transaction.transaction_date >= start_date
        )

    if end_date is not None:
        recent_query = recent_query.filter(
            Transaction.transaction_date <= end_date
        )

    recent_rows = (
        recent_query
        .order_by(
            Transaction.transaction_date.desc(),
            Transaction.created_at.desc(),
        )
        .limit(10)
        .all()
    )

    recent_transactions = []

    for (
        transaction,
        account_name,
        account_institution_name,
        category_name,
    ) in recent_rows:

        recent_transactions.append(
            {
                "id": transaction.id,
                "account_id": transaction.account_id,
                "category_id": transaction.category_id,
                "transaction_type": (
                    transaction.transaction_type
                ),
                "amount": transaction.amount,
                "transaction_date": (
                    transaction.transaction_date
                ),
                "description": (
                    transaction.description
                ),
                "merchant": transaction.merchant,
                "notes": transaction.notes,
                "account_name": account_name,
                "account_institution_name": (
                    account_institution_name
                ),
                "category_name": category_name,
            }
        )

    return {
        "user_id": user_id,
        "balance": total_balance,
        "income": summary["income"],
        "expense": summary["expense"],
        "net": summary["net"],
        "start_date": summary_start_date,
        "end_date": summary_end_date,
        "expenses_by_category": (
            category_data["items"]
        ),
        "monthly_cash_flow": (
            monthly_data["items"]
        ),
        "recent_transactions": (
            recent_transactions
        ),
    }