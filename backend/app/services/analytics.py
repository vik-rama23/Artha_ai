from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.accounts import Account
from app.models.categories import Category
from app.models.transactions import Transaction


def get_income_expense_summary(
    db: Session,
    user_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, Decimal]:

    query = db.query(
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type
                        == "INCOME",
                        Transaction.amount,
                    ),
                    else_=Decimal("0.00"),
                )
            ),
            Decimal("0.00"),
        ).label("income"),
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type
                        == "EXPENSE",
                        Transaction.amount,
                    ),
                    else_=Decimal("0.00"),
                )
            ),
            Decimal("0.00"),
        ).label("expense"),
    ).filter(
        Transaction.user_id == user_id,
    )

    if start_date is not None:
        query = query.filter(
            Transaction.transaction_date >= start_date
        )

    if end_date is not None:
        query = query.filter(
            Transaction.transaction_date <= end_date
        )

    result = query.one()

    income = (
        result.income
        or Decimal("0.00")
    )

    expense = (
        result.expense
        or Decimal("0.00")
    )

    return {
        "income": income,
        "expense": expense,
        "net": income - expense,
    }


def get_expenses_by_category(
    db: Session,
    user_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:

    query = (
        db.query(
            Transaction.category_id,
            Category.name.label(
                "category_name"
            ),
            func.sum(
                Transaction.amount
            ).label("amount"),
        )
        .outerjoin(
            Category,
            Transaction.category_id
            == Category.id,
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type
            == "EXPENSE",
        )
    )

    if start_date is not None:
        query = query.filter(
            Transaction.transaction_date
            >= start_date
        )

    if end_date is not None:
        query = query.filter(
            Transaction.transaction_date
            <= end_date
        )

    rows = (
        query
        .group_by(
            Transaction.category_id,
            Category.name,
        )
        .order_by(
            func.sum(
                Transaction.amount
            ).desc()
        )
        .all()
    )

    total_expense = sum(
        (
            row.amount
            for row in rows
        ),
        Decimal("0.00"),
    )

    items = []

    for row in rows:
        amount = (
            row.amount
            or Decimal("0.00")
        )

        if total_expense > 0:
            percentage = (
                amount
                / total_expense
                * Decimal("100")
            ).quantize(
                Decimal("0.01")
            )
        else:
            percentage = Decimal("0.00")

        category_name = (
            row.category_name
            if row.category_name
            else "Uncategorized"
        )

        items.append(
            {
                "category_id": row.category_id,
                "category_name": category_name,
                "amount": amount,
                "percentage": percentage,
            }
        )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_expense": total_expense,
        "items": items,
    }


def get_monthly_cash_flow(
    db: Session,
    user_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:

    month_expression = func.date_trunc(
        "month",
        Transaction.transaction_date,
    )

    query = db.query(
        month_expression.label("month"),
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type
                        == "INCOME",
                        Transaction.amount,
                    ),
                    else_=Decimal("0.00"),
                )
            ),
            Decimal("0.00"),
        ).label("income"),
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type
                        == "EXPENSE",
                        Transaction.amount,
                    ),
                    else_=Decimal("0.00"),
                )
            ),
            Decimal("0.00"),
        ).label("expense"),
    ).filter(
        Transaction.user_id == user_id,
    )

    if start_date is not None:
        query = query.filter(
            Transaction.transaction_date
            >= start_date
        )

    if end_date is not None:
        query = query.filter(
            Transaction.transaction_date
            <= end_date
        )

    rows = (
        query
        .group_by(month_expression)
        .order_by(
            month_expression.asc()
        )
        .all()
    )

    items = []

    for row in rows:
        income = (
            row.income
            or Decimal("0.00")
        )

        expense = (
            row.expense
            or Decimal("0.00")
        )

        items.append(
            {
                "month": row.month.strftime(
                    "%Y-%m"
                ),
                "income": income,
                "expense": expense,
                "net": income - expense,
            }
        )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "items": items,
    }


def _calculate_percentage_change(
    current: Decimal,
    previous: Decimal,
) -> Decimal | None:

    if previous == Decimal("0.00"):
        return None

    return (
        (
            current - previous
        )
        / previous
        * Decimal("100")
    ).quantize(
        Decimal("0.01")
    )


def get_analytics_comparison(
    db: Session,
    user_id: UUID,
    current_start_date: date,
    current_end_date: date,
    previous_start_date: date,
    previous_end_date: date,
) -> dict:

    current_summary = (
        get_income_expense_summary(
            db=db,
            user_id=user_id,
            start_date=current_start_date,
            end_date=current_end_date,
        )
    )

    previous_summary = (
        get_income_expense_summary(
            db=db,
            user_id=user_id,
            start_date=previous_start_date,
            end_date=previous_end_date,
        )
    )

    current_income = current_summary[
        "income"
    ]

    previous_income = previous_summary[
        "income"
    ]

    current_expense = current_summary[
        "expense"
    ]

    previous_expense = previous_summary[
        "expense"
    ]

    current_net = current_summary[
        "net"
    ]

    previous_net = previous_summary[
        "net"
    ]

    income_change = (
        current_income
        - previous_income
    )

    expense_change = (
        current_expense
        - previous_expense
    )

    net_change = (
        current_net
        - previous_net
    )

    return {
        "current_period": {
            "start_date": current_start_date,
            "end_date": current_end_date,
            "income": current_income,
            "expense": current_expense,
            "net": current_net,
        },
        "previous_period": {
            "start_date": previous_start_date,
            "end_date": previous_end_date,
            "income": previous_income,
            "expense": previous_expense,
            "net": previous_net,
        },
        "income": {
            "current": current_income,
            "previous": previous_income,
            "change": income_change,
            "change_percentage": (
                _calculate_percentage_change(
                    current=current_income,
                    previous=previous_income,
                )
            ),
        },
        "expense": {
            "current": current_expense,
            "previous": previous_expense,
            "change": expense_change,
            "change_percentage": (
                _calculate_percentage_change(
                    current=current_expense,
                    previous=previous_expense,
                )
            ),
        },
        "net": {
            "current": current_net,
            "previous": previous_net,
            "change": net_change,
            "change_percentage": (
                _calculate_percentage_change(
                    current=current_net,
                    previous=previous_net,
                )
            ),
        },
    }


def get_category_trends(
    db: Session,
    user_id: UUID,
    current_start_date: date,
    current_end_date: date,
    previous_start_date: date,
    previous_end_date: date,
) -> dict:

    current_query = (
        db.query(
            Transaction.category_id,
            Category.name.label(
                "category_name"
            ),
            func.sum(
                Transaction.amount
            ).label("amount"),
        )
        .outerjoin(
            Category,
            Transaction.category_id
            == Category.id,
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type
            == "EXPENSE",
            Transaction.transaction_date
            >= current_start_date,
            Transaction.transaction_date
            <= current_end_date,
        )
        .group_by(
            Transaction.category_id,
            Category.name,
        )
    )

    previous_query = (
        db.query(
            Transaction.category_id,
            Category.name.label(
                "category_name"
            ),
            func.sum(
                Transaction.amount
            ).label("amount"),
        )
        .outerjoin(
            Category,
            Transaction.category_id
            == Category.id,
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type
            == "EXPENSE",
            Transaction.transaction_date
            >= previous_start_date,
            Transaction.transaction_date
            <= previous_end_date,
        )
        .group_by(
            Transaction.category_id,
            Category.name,
        )
    )

    current_rows = current_query.all()
    previous_rows = previous_query.all()

    current_map: dict[
        UUID | None,
        dict,
    ] = {}

    previous_map: dict[
        UUID | None,
        dict,
    ] = {}

    for row in current_rows:
        current_map[
            row.category_id
        ] = {
            "category_name": (
                row.category_name
                or "Uncategorized"
            ),
            "amount": (
                row.amount
                or Decimal("0.00")
            ),
        }

    for row in previous_rows:
        previous_map[
            row.category_id
        ] = {
            "category_name": (
                row.category_name
                or "Uncategorized"
            ),
            "amount": (
                row.amount
                or Decimal("0.00")
            ),
        }

    category_ids = (
        set(current_map.keys())
        | set(previous_map.keys())
    )

    total_current_expense = sum(
        (
            data["amount"]
            for data in current_map.values()
        ),
        Decimal("0.00"),
    )

    total_previous_expense = sum(
        (
            data["amount"]
            for data in previous_map.values()
        ),
        Decimal("0.00"),
    )

    items = []

    for category_id in category_ids:
        current_data = current_map.get(
            category_id
        )

        previous_data = previous_map.get(
            category_id
        )

        current_amount = (
            current_data["amount"]
            if current_data
            else Decimal("0.00")
        )

        previous_amount = (
            previous_data["amount"]
            if previous_data
            else Decimal("0.00")
        )

        category_name = (
            current_data["category_name"]
            if current_data
            else previous_data["category_name"]
        )

        change = (
            current_amount
            - previous_amount
        )

        change_percentage = (
            _calculate_percentage_change(
                current=current_amount,
                previous=previous_amount,
            )
        )

        if total_current_expense > 0:
            current_percentage = (
                current_amount
                / total_current_expense
                * Decimal("100")
            ).quantize(
                Decimal("0.01")
            )
        else:
            current_percentage = Decimal(
                "0.00"
            )

        items.append(
            {
                "category_id": category_id,
                "category_name": category_name,
                "current_amount": current_amount,
                "previous_amount": previous_amount,
                "change": change,
                "change_percentage": change_percentage,
                "current_percentage": current_percentage,
            }
        )

    items.sort(
        key=lambda item: item[
            "current_amount"
        ],
        reverse=True,
    )

    return {
        "current_period_start_date": (
            current_start_date
        ),
        "current_period_end_date": (
            current_end_date
        ),
        "previous_period_start_date": (
            previous_start_date
        ),
        "previous_period_end_date": (
            previous_end_date
        ),
        "total_current_expense": (
            total_current_expense
        ),
        "total_previous_expense": (
            total_previous_expense
        ),
        "items": items,
    }


def get_top_transactions(
    db: Session,
    user_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 5,
) -> dict:

    query = (
        db.query(
            Transaction,
            Category.name.label(
                "category_name"
            ),
            Account.name.label(
                "account_name"
            ),
        )
        .outerjoin(
            Category,
            Transaction.category_id
            == Category.id,
        )
        .join(
            Account,
            Transaction.account_id
            == Account.id,
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type
            == "EXPENSE",
        )
    )

    if start_date is not None:
        query = query.filter(
            Transaction.transaction_date
            >= start_date
        )

    if end_date is not None:
        query = query.filter(
            Transaction.transaction_date
            <= end_date
        )

    total_expense = (
        query.with_entities(
            func.coalesce(
                func.sum(
                    Transaction.amount
                ),
                Decimal("0.00"),
            )
        ).scalar()
        or Decimal("0.00")
    )

    rows = (
        query
        .order_by(
            Transaction.amount.desc(),
            Transaction.transaction_date.desc(),
        )
        .limit(limit)
        .all()
    )

    items = []

    for transaction, category_name, account_name in rows:
        items.append(
            {
                "transaction_id": transaction.id,
                "transaction_date": (
                    transaction.transaction_date
                ),
                "amount": transaction.amount,
                "merchant": transaction.merchant,
                "description": transaction.description,
                "category_id": transaction.category_id,
                "category_name": (
                    category_name
                    or "Uncategorized"
                ),
                "account_id": transaction.account_id,
                "account_name": account_name,
            }
        )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "limit": limit,
        "total_expense": total_expense,
        "items": items,
    }

def get_savings_trend(
    db: Session,
    user_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    month_expression = func.date_trunc(
        "month",
        Transaction.transaction_date,
    )

    query = db.query(
        month_expression.label("month"),
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type
                        == "INCOME",
                        Transaction.amount,
                    ),
                    else_=Decimal("0.00"),
                )
            ),
            Decimal("0.00"),
        ).label("income"),
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type
                        == "EXPENSE",
                        Transaction.amount,
                    ),
                    else_=Decimal("0.00"),
                )
            ),
            Decimal("0.00"),
        ).label("expense"),
    ).filter(
        Transaction.user_id == user_id,
    )

    if start_date is not None:
        query = query.filter(
            Transaction.transaction_date >= start_date
        )

    if end_date is not None:
        query = query.filter(
            Transaction.transaction_date <= end_date
        )

    rows = (
        query
        .group_by(month_expression)
        .order_by(month_expression.asc())
        .all()
    )

    items = []

    total_income = Decimal("0.00")
    total_expense = Decimal("0.00")

    for row in rows:
        income = (
            row.income
            or Decimal("0.00")
        )

        expense = (
            row.expense
            or Decimal("0.00")
        )

        savings = income - expense

        if income > Decimal("0.00"):
            savings_rate = (
                savings
                / income
                * Decimal("100")
            ).quantize(
                Decimal("0.01")
            )
        else:
            savings_rate = Decimal("0.00")

        total_income += income
        total_expense += expense

        items.append(
            {
                "month": row.month.strftime("%Y-%m"),
                "income": income,
                "expense": expense,
                "savings": savings,
                "savings_rate": savings_rate,
            }
        )

    total_savings = (
        total_income - total_expense
    )

    if total_income > Decimal("0.00"):
        average_savings_rate = (
            total_savings
            / total_income
            * Decimal("100")
        ).quantize(
            Decimal("0.01")
        )
    else:
        average_savings_rate = Decimal("0.00")

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_income": total_income,
        "total_expense": total_expense,
        "total_savings": total_savings,
        "average_savings_rate": average_savings_rate,
        "items": items,
    }

def get_analytics_insights(
    db: Session,
    user_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    summary = get_income_expense_summary(
        db=db,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    expense_categories = get_expenses_by_category(
        db=db,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    monthly_cash_flow = get_monthly_cash_flow(
        db=db,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    top_transactions = get_top_transactions(
        db=db,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        limit=1,
    )

    income = summary["income"]
    expense = summary["expense"]
    savings = summary["net"]

    if income > Decimal("0.00"):
        savings_rate = (
            savings
            / income
            * Decimal("100")
        ).quantize(
            Decimal("0.01")
        )
    else:
        savings_rate = Decimal("0.00")

    insights = []

    # ---------------------------------------------------------
    # Savings rate
    # ---------------------------------------------------------

    if income > Decimal("0.00"):
        insights.append(
            {
                "type": "SAVINGS_RATE",
                "title": "Savings rate",
                "message": (
                    f"Your savings rate for this period "
                    f"is {savings_rate}%."
                ),
                "value": savings,
                "percentage": savings_rate,
            }
        )

    # ---------------------------------------------------------
    # Highest spending category
    # ---------------------------------------------------------

    category_items = expense_categories["items"]

    if category_items:
        highest_category = category_items[0]

        insights.append(
            {
                "type": "TOP_CATEGORY",
                "title": "Highest spending category",
                "message": (
                    f"{highest_category['category_name']} "
                    f"accounts for "
                    f"{highest_category['percentage']}% "
                    f"of your expenses."
                ),
                "value": highest_category["amount"],
                "percentage": highest_category["percentage"],
            }
        )

    # ---------------------------------------------------------
    # Largest transaction
    # ---------------------------------------------------------

    top_items = top_transactions["items"]

    if top_items:
        largest_transaction = top_items[0]

        merchant = (
            largest_transaction["merchant"]
            or largest_transaction["description"]
            or "Unknown transaction"
        )

        insights.append(
            {
                "type": "LARGEST_TRANSACTION",
                "title": "Largest transaction",
                "message": (
                    f"Your largest expense was "
                    f"₹{largest_transaction['amount']} "
                    f"at {merchant}."
                ),
                "value": largest_transaction["amount"],
                "percentage": None,
            }
        )

    # ---------------------------------------------------------
    # Highest expense month
    # ---------------------------------------------------------

    monthly_items = monthly_cash_flow["items"]

    if monthly_items:
        highest_expense_month = max(
            monthly_items,
            key=lambda item: item["expense"],
        )

        insights.append(
            {
                "type": "HIGHEST_EXPENSE_MONTH",
                "title": "Highest expense month",
                "message": (
                    f"{highest_expense_month['month']} "
                    f"had your highest monthly spending "
                    f"at ₹{highest_expense_month['expense']}."
                ),
                "value": highest_expense_month["expense"],
                "percentage": None,
            }
        )

        # -----------------------------------------------------
        # Highest savings month
        # -----------------------------------------------------

        highest_savings_month = max(
            monthly_items,
            key=lambda item: item["net"],
        )

        insights.append(
            {
                "type": "HIGHEST_SAVINGS_MONTH",
                "title": "Highest savings month",
                "message": (
                    f"{highest_savings_month['month']} "
                    f"had your highest monthly savings "
                    f"of ₹{highest_savings_month['net']}."
                ),
                "value": highest_savings_month["net"],
                "percentage": None,
            }
        )

    # ---------------------------------------------------------
    # Positive / negative savings
    # ---------------------------------------------------------

    if income > Decimal("0.00"):
        if savings > Decimal("0.00"):
            insights.append(
                {
                    "type": "POSITIVE_SAVINGS",
                    "title": "Positive cash flow",
                    "message": (
                        f"You saved ₹{savings} "
                        f"more than you spent during this period."
                    ),
                    "value": savings,
                    "percentage": savings_rate,
                }
            )

        elif savings < Decimal("0.00"):
            deficit = abs(savings)

            insights.append(
                {
                    "type": "NEGATIVE_SAVINGS",
                    "title": "Negative cash flow",
                    "message": (
                        f"Your expenses exceeded your income "
                        f"by ₹{deficit} during this period."
                    ),
                    "value": deficit,
                    "percentage": None,
                }
            )

    # ---------------------------------------------------------
    # Keep the most useful insights first
    # ---------------------------------------------------------

    insight_priority = {
        "SAVINGS_RATE": 1,
        "TOP_CATEGORY": 2,
        "LARGEST_TRANSACTION": 3,
        "HIGHEST_EXPENSE_MONTH": 4,
        "HIGHEST_SAVINGS_MONTH": 5,
        "POSITIVE_SAVINGS": 6,
        "NEGATIVE_SAVINGS": 6,
    }

    insights.sort(
        key=lambda insight: insight_priority.get(
            insight["type"],
            99,
        )
    )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "income": income,
        "expense": expense,
        "savings": savings,
        "savings_rate": savings_rate,
        "insights": insights,
    }
