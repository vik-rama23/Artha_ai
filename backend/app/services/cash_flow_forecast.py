from calendar import monthrange
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.accounts import Account
from app.models.recurring_transactions import RecurringTransaction
from app.models.transactions import Transaction
from app.services.accounts import get_account_balance
from app.services.recurring_transactions import calculate_next_occurrence
from app.services.analytics import get_income_expense_summary


ZERO = Decimal("0.00")

def _month_end(value: date) -> date:
    return date(
        value.year,
        value.month,
        monthrange(value.year, value.month)[1],
    )


def _round_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


def _get_current_balance(
    db: Session,
    user_id: UUID,
) -> Decimal:
    accounts = (
        db.query(Account)
        .filter(Account.user_id == user_id)
        .all()
    )

    return sum(
        (
            get_account_balance(
                db=db,
                account_id=account.id,
            )
            for account in accounts
        ),
        ZERO,
    )


def _get_variable_expense_rate(
    db: Session,
    user_id: UUID,
    today: date,
) -> tuple[Decimal, str]:
    """
    Estimate the user's daily variable spending rate.

    Current month is preferred when there is enough elapsed
    time to produce a meaningful rate. Recurring-generated
    expenses are excluded because future recurring expenses
    are forecast separately.

    If the current month has no variable spending, use the
    average daily variable expense from the previous three
    completed months.
    """

    month_start = today.replace(day=1)
    elapsed_days = max(today.day, 1)

    current_variable_expense = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "EXPENSE",
            Transaction.transaction_date >= month_start,
            Transaction.transaction_date <= today,
            Transaction.recurring_transaction_id.is_(None),
        )
        .all()
    )

    current_total = sum(
        (transaction.amount for transaction in current_variable_expense),
        ZERO,
    )

    if current_total > ZERO:
        daily_rate = current_total / Decimal(elapsed_days)
        return _round_money(daily_rate), "current_month"

    previous_month_totals: list[Decimal] = []

    year = today.year
    month = today.month

    for _ in range(3):
        month -= 1
        if month == 0:
            month = 12
            year -= 1

        start = date(year, month, 1)
        end = _month_end(start)

        total = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_type == "EXPENSE",
                Transaction.transaction_date >= start,
                Transaction.transaction_date <= end,
                Transaction.recurring_transaction_id.is_(None),
            )
            .with_entities(Transaction.amount)
            .all()
        )

        month_total = sum(
            (row.amount for row in total),
            ZERO,
        )
        previous_month_totals.append(month_total)

    if previous_month_totals:
        average_monthly_expense = (
            sum(previous_month_totals, ZERO)
            / Decimal(len(previous_month_totals))
        )

        average_days = Decimal("30.4375")
        daily_rate = average_monthly_expense / average_days

        return _round_money(daily_rate), "previous_3_months"

    return ZERO, "no_history"


def _get_upcoming_recurring_items(
    db: Session,
    user_id: UUID,
    start_date: date,
    end_date: date,
) -> list[dict]:
    rules = (
        db.query(RecurringTransaction)
        .filter(
            RecurringTransaction.user_id == user_id,
            RecurringTransaction.is_active.is_(True),
            RecurringTransaction.next_occurrence <= end_date,
        )
        .order_by(
            RecurringTransaction.next_occurrence.asc(),
            RecurringTransaction.created_at.asc(),
        )
        .all()
    )

    items: list[dict] = []

    for rule in rules:
        occurrence = rule.next_occurrence

        # A rule can be overdue if the scheduler has not yet
        # generated its transaction. Treat the next due date as
        # today for forecasting rather than losing the commitment.
        while occurrence < start_date:
            occurrence = calculate_next_occurrence(
                current_date=occurrence,
                frequency=rule.frequency,
            )

        while occurrence <= end_date:
            if (
                rule.end_date is not None
                and occurrence > rule.end_date
            ):
                break

            items.append(
                {
                    "recurring_transaction_id": str(rule.id),
                    "name": rule.name,
                    "transaction_type": rule.transaction_type,
                    "amount": rule.amount,
                    "occurrence_date": occurrence,
                    "frequency": rule.frequency,
                }
            )

            occurrence = calculate_next_occurrence(
                current_date=occurrence,
                frequency=rule.frequency,
            )

    items.sort(
        key=lambda item: (
            item["occurrence_date"],
            item["name"].lower(),
        )
    )

    return items


def _get_status_and_insight(
    projected_month_end_balance: Decimal,
    current_balance: Decimal,
    projected_expense: Decimal,
) -> tuple[str, str]:
    if projected_month_end_balance < ZERO:
        deficit = abs(projected_month_end_balance)
        return (
            "RISK",
            (
                "Your projected expenses may exceed available funds by "
                f"₹{deficit:,.0f}. Review discretionary spending before "
                "the month ends."
            ),
        )

    if current_balance > ZERO:
        if projected_month_end_balance < current_balance * Decimal("0.10"):
            return (
                "WATCH",
                (
                    "Your projected month-end balance is getting low. "
                    "Consider reducing discretionary spending."
                ),
            )

    return (
        "HEALTHY",
        (
            "You are projected to finish the month with a positive "
            "cash balance. Keep your spending within the forecast."
        ),
    )


def get_cash_flow_forecast(
    db: Session,
    user_id: UUID,
    forecast_date: date | None = None,
) -> dict:
    today = forecast_date or date.today()
    month_start = today.replace(day=1)
    month_end = _month_end(today)

    days_elapsed = today.day
    days_remaining = max(
        (month_end - today).days,
        0,
    )

    current_summary = get_income_expense_summary(
        db=db,
        user_id=user_id,
        start_date=month_start,
        end_date=today,
    )

    current_balance = _get_current_balance(
        db=db,
        user_id=user_id,
    )

    upcoming_items = _get_upcoming_recurring_items(
        db=db,
        user_id=user_id,
        start_date=today,
        end_date=month_end,
    )

    expected_recurring_income = sum(
        (
            item["amount"]
            for item in upcoming_items
            if item["transaction_type"] == "INCOME"
        ),
        ZERO,
    )

    expected_recurring_expense = sum(
        (
            item["amount"]
            for item in upcoming_items
            if item["transaction_type"] == "EXPENSE"
        ),
        ZERO,
    )

    daily_variable_expense, variable_source = (
        _get_variable_expense_rate(
            db=db,
            user_id=user_id,
            today=today,
        )
    )

    projected_variable_expense = (
        daily_variable_expense
        * Decimal(days_remaining)
    )

    projected_income = (
        expected_recurring_income
    )

    projected_expense = (
        expected_recurring_expense
        + projected_variable_expense
    )

    projected_month_end_balance = (
        current_balance
        + projected_income
        - projected_expense
    )

    projected_month_end_balance = _round_money(
        projected_month_end_balance
    )

    status, insight = _get_status_and_insight(
        projected_month_end_balance=projected_month_end_balance,
        current_balance=current_balance,
        projected_expense=projected_expense,
    )

    return {
        "forecast_start_date": today,
        "forecast_end_date": month_end,
        "days_elapsed": days_elapsed,
        "days_remaining": days_remaining,
        "current_balance": _round_money(current_balance),
        "current_month_income": _round_money(
            current_summary["income"]
        ),
        "current_month_expense": _round_money(
            current_summary["expense"]
        ),
        "current_month_net": _round_money(
            current_summary["net"]
        ),
        "expected_recurring_income": _round_money(
            expected_recurring_income
        ),
        "expected_recurring_expense": _round_money(
            expected_recurring_expense
        ),
        "projected_variable_expense": _round_money(
            projected_variable_expense
        ),
        "projected_income": _round_money(projected_income),
        "projected_expense": _round_money(projected_expense),
        "projected_month_end_balance": projected_month_end_balance,
        "average_daily_variable_expense": daily_variable_expense,
        "variable_expense_source": variable_source,
        "status": status,
        "insight": insight,
        "upcoming_items": upcoming_items,
    }
