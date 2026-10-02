from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.accounts import Account
from app.models.categories import Category
from app.models.transactions import Transaction


def get_top_transactions(
    db: Session,
    user_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 5,
) -> dict:
    filters = [
        Transaction.user_id == user_id,
        Transaction.transaction_type == "EXPENSE",
    ]

    if start_date is not None:
        filters.append(
            Transaction.transaction_date >= start_date
        )

    if end_date is not None:
        filters.append(
            Transaction.transaction_date <= end_date
        )

    total_expense = (
        db.query(
            func.coalesce(
                func.sum(Transaction.amount),
                Decimal("0.00"),
            )
        )
        .filter(*filters)
        .scalar()
    ) or Decimal("0.00")

    rows = (
        db.query(
            Transaction.id.label("transaction_id"),
            Transaction.transaction_date,
            Transaction.amount,
            Transaction.merchant,
            Transaction.description,
            Transaction.category_id,
            Category.name.label("category_name"),
            Account.id.label("account_id"),
            Account.name.label("account_name"),
        )
        .join(
            Account,
            (Transaction.account_id == Account.id)
            & (Account.user_id == user_id),
        )
        .outerjoin(
            Category,
            (Transaction.category_id == Category.id)
            & (
                (Category.is_system.is_(True))
                | (Category.user_id == user_id)
            ),
        )
        .filter(*filters)
        .order_by(
            Transaction.amount.desc(),
            Transaction.transaction_date.desc(),
            Transaction.created_at.desc(),
        )
        .limit(limit)
        .all()
    )

    items = [
        {
            "transaction_id": row.transaction_id,
            "transaction_date": row.transaction_date,
            "amount": row.amount or Decimal("0.00"),
            "merchant": row.merchant,
            "description": row.description,
            "category_id": row.category_id,
            "category_name": (
                row.category_name
                or "Uncategorized"
            ),
            "account_id": row.account_id,
            "account_name": row.account_name,
        }
        for row in rows
    ]

    return {
        "start_date": start_date,
        "end_date": end_date,
        "limit": limit,
        "total_expense": total_expense,
        "items": items,
    }