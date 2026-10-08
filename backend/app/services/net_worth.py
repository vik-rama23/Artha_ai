from calendar import monthrange
from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.accounts import Account
from app.models.net_worth import NetWorthItem
from app.models.transactions import Transaction
from app.schemas.net_worth import (
    NetWorthItemCreate,
    NetWorthItemUpdate,
)


ASSET_ACCOUNT_TYPES = {"BANK", "CASH", "INVESTMENT"}
LIABILITY_ACCOUNT_TYPES = {"CREDIT_CARD"}


def _account_balance_at(
    db: Session,
    account: Account,
    as_of_date: date,
) -> Decimal:
    transactions = db.scalars(
        select(Transaction)
        .where(Transaction.account_id == account.id)
        .where(Transaction.transaction_date <= as_of_date)
    ).all()

    balance = account.opening_balance

    for transaction in transactions:
        if transaction.transaction_type == "INCOME":
            balance += transaction.amount
        elif transaction.transaction_type == "EXPENSE":
            balance -= transaction.amount

    return balance


def _manual_items_at(
    db: Session,
    user_id: UUID,
    as_of_date: date,
) -> list[NetWorthItem]:
    items = db.scalars(
        select(NetWorthItem)
        .where(NetWorthItem.user_id == user_id)
        .where(NetWorthItem.as_of_date <= as_of_date)
        .order_by(NetWorthItem.as_of_date.asc(), NetWorthItem.created_at.asc())
    ).all()

    latest: dict[tuple[str, str], NetWorthItem] = {}

    for item in items:
        latest[(item.item_type, str(item.id))] = item

    return list(latest.values())


def _build_snapshot(
    db: Session,
    user_id: UUID,
    as_of_date: date,
) -> tuple[Decimal, Decimal, list[dict], list[dict]]:
    accounts = db.scalars(
        select(Account)
        .where(Account.user_id == user_id)
    ).all()

    assets = Decimal("0.00")
    liabilities = Decimal("0.00")
    asset_items: list[dict] = []
    liability_items: list[dict] = []

    for account in accounts:
        balance = _account_balance_at(
            db=db,
            account=account,
            as_of_date=as_of_date,
        )

        if account.account_type.upper() in ASSET_ACCOUNT_TYPES:
            if balance > 0:
                assets += balance
                asset_items.append({
                    "name": account.name,
                    "category": account.account_type.upper(),
                    "source": "ACCOUNT",
                    "value": balance,
                })
        elif account.account_type.upper() in LIABILITY_ACCOUNT_TYPES:
            liability = max(balance, Decimal("0.00"))
            if liability > 0:
                liabilities += liability
                liability_items.append({
                    "name": account.name,
                    "category": account.account_type.upper(),
                    "source": "ACCOUNT",
                    "value": liability,
                })

    manual_items = _manual_items_at(
        db=db,
        user_id=user_id,
        as_of_date=as_of_date,
    )

    for item in manual_items:
        if item.item_type == "ASSET":
            assets += item.value
            asset_items.append({
                "name": item.name,
                "category": item.category,
                "source": "MANUAL",
                "value": item.value,
            })
        else:
            liabilities += item.value
            liability_items.append({
                "name": item.name,
                "category": item.category,
                "source": "MANUAL",
                "value": item.value,
            })

    return assets, liabilities, asset_items, liability_items


def _month_end(year: int, month: int) -> date:
    return date(year, month, monthrange(year, month)[1])


def _subtract_months(value: date, months: int) -> date:
    month_index = value.year * 12 + value.month - 1 - months
    year = month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def get_net_worth(
    db: Session,
    user_id: UUID,
    as_of_date: date | None = None,
) -> dict:
    today = as_of_date or date.today()

    assets, liabilities, asset_items, liability_items = _build_snapshot(
        db=db,
        user_id=user_id,
        as_of_date=today,
    )

    previous_date = _subtract_months(today, 1)
    previous_month_end = _month_end(
        previous_date.year,
        previous_date.month,
    )

    previous_assets, previous_liabilities, _, _ = _build_snapshot(
        db=db,
        user_id=user_id,
        as_of_date=previous_month_end,
    )

    history: list[dict] = []

    for offset in range(11, -1, -1):
        month_start = _subtract_months(
            date(today.year, today.month, 1),
            offset,
        )
        month_end = _month_end(
            month_start.year,
            month_start.month,
        )

        month_assets, month_liabilities, _, _ = _build_snapshot(
            db=db,
            user_id=user_id,
            as_of_date=month_end,
        )

        history.append({
            "month": month_start,
            "assets": month_assets,
            "liabilities": month_liabilities,
            "net_worth": month_assets - month_liabilities,
        })

    return {
        "as_of_date": today,
        "total_assets": assets,
        "total_liabilities": liabilities,
        "net_worth": assets - liabilities,
        "asset_change": assets - previous_assets,
        "liability_change": liabilities - previous_liabilities,
        "net_worth_change": (
            (assets - liabilities)
            - (previous_assets - previous_liabilities)
        ),
        "asset_items": asset_items,
        "liability_items": liability_items,
        "history": history,
    }


def get_net_worth_items(
    db: Session,
    user_id: UUID,
) -> list[NetWorthItem]:
    return list(
        db.scalars(
            select(NetWorthItem)
            .where(NetWorthItem.user_id == user_id)
            .order_by(
                NetWorthItem.item_type.asc(),
                NetWorthItem.category.asc(),
                NetWorthItem.name.asc(),
            )
        ).all()
    )


def create_net_worth_item(
    db: Session,
    user_id: UUID,
    payload: NetWorthItemCreate,
) -> NetWorthItem:
    item = NetWorthItem(
        user_id=user_id,
        name=payload.name,
        item_type=payload.item_type,
        category=payload.category,
        value=payload.value,
        as_of_date=payload.as_of_date,
        notes=payload.notes,
    )

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_net_worth_item(
    db: Session,
    user_id: UUID,
    item_id: UUID,
    payload: NetWorthItemUpdate,
) -> NetWorthItem:
    item = db.scalar(
        select(NetWorthItem)
        .where(NetWorthItem.id == item_id)
        .where(NetWorthItem.user_id == user_id)
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Net worth item not found.",
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


def delete_net_worth_item(
    db: Session,
    user_id: UUID,
    item_id: UUID,
) -> None:
    item = db.scalar(
        select(NetWorthItem)
        .where(NetWorthItem.id == item_id)
        .where(NetWorthItem.user_id == user_id)
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Net worth item not found.",
        )

    db.delete(item)
    db.commit()
