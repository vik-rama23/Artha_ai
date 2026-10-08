from calendar import monthrange
from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.accounts import Account
from app.models.net_worth import NetWorthItem
from app.models.transactions import Transaction
from app.schemas.net_worth import NetWorthItemCreate, NetWorthItemUpdate


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
        .order_by(Transaction.transaction_date.asc())
    ).all()

    balance = account.opening_balance
    is_liability = account.account_type.upper() in LIABILITY_ACCOUNT_TYPES

    for transaction in transactions:
        if transaction.transaction_type == "INCOME":
            balance += -transaction.amount if is_liability else transaction.amount
        elif transaction.transaction_type == "EXPENSE":
            balance += transaction.amount if is_liability else -transaction.amount

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
        .where(NetWorthItem.history_start_date <= as_of_date)
        .order_by(NetWorthItem.as_of_date.asc(), NetWorthItem.created_at.asc())
    ).all()

    latest: dict[tuple[str, str, str], NetWorthItem] = {}

    for item in items:
        latest[
            (item.item_type, item.category, item.name.strip().lower())
        ] = item

    return list(latest.values())


def _build_snapshot(
    db: Session,
    user_id: UUID,
    as_of_date: date,
) -> tuple[Decimal, Decimal, list[dict], list[dict]]:
    accounts = db.scalars(
        select(Account).where(Account.user_id == user_id)
    ).all()

    assets = Decimal("0.00")
    liabilities = Decimal("0.00")
    asset_items: list[dict] = []
    liability_items: list[dict] = []

    for account in accounts:
        account_type = account.account_type.upper()
        balance = _account_balance_at(db, account, as_of_date)

        if account_type in ASSET_ACCOUNT_TYPES:
            if balance > 0:
                assets += balance
                asset_items.append({
                    "name": account.name,
                    "category": account_type,
                    "source": "ACCOUNT",
                    "value": balance,
                })
            elif balance < 0:
                # Negative bank/cash/investment balances represent
                # an overdraft or margin liability.
                overdraft = abs(balance)
                liabilities += overdraft
                liability_items.append({
                    "name": account.name,
                    "category": "OVERDRAFT",
                    "source": "ACCOUNT",
                    "value": overdraft,
                })
        elif account_type in LIABILITY_ACCOUNT_TYPES:
            if balance > 0:
                liabilities += balance
                liability_items.append({
                    "name": account.name,
                    "category": account_type,
                    "source": "ACCOUNT",
                    "value": balance,
                })
            elif balance < 0:
                # A negative credit-card balance means the issuer
                # owes the user money, so it is an asset.
                credit_balance = abs(balance)
                assets += credit_balance
                asset_items.append({
                    "name": account.name,
                    "category": "CREDIT_BALANCE",
                    "source": "ACCOUNT",
                    "value": credit_balance,
                })

    for item in _manual_items_at(db, user_id, as_of_date):
        target = asset_items if item.item_type == "ASSET" else liability_items
        target.append({
            "name": item.name,
            "category": item.category,
            "source": "MANUAL",
            "value": item.value,
        })

        if item.item_type == "ASSET":
            assets += item.value
        else:
            liabilities += item.value

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
        db, user_id, today
    )

    previous_start = _subtract_months(today, 1)
    previous_end = _month_end(previous_start.year, previous_start.month)
    previous_assets, previous_liabilities, _, _ = _build_snapshot(
        db, user_id, previous_end
    )

    history: list[dict] = []

    for offset in range(11, -1, -1):
        month_start = _subtract_months(
            date(today.year, today.month, 1),
            offset,
        )
        month_end = _month_end(month_start.year, month_start.month)
        month_assets, month_liabilities, _, _ = _build_snapshot(
            db, user_id, month_end
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
            assets - liabilities
            - (previous_assets - previous_liabilities)
        ),
        "asset_items": asset_items,
        "liability_items": liability_items,
        "history": history,
    }


def get_net_worth_items(db: Session, user_id: UUID) -> list[NetWorthItem]:
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
    history_start_date = payload.history_start_date or payload.as_of_date

    if history_start_date > payload.as_of_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="History start date cannot be after the as-of date.",
        )

    data = payload.model_dump()
    data["history_start_date"] = history_start_date

    item = NetWorthItem(user_id=user_id, **data)
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

    values = payload.model_dump(exclude_unset=True)

    effective_as_of_date = values.get("as_of_date", item.as_of_date)
    effective_history_start_date = values.get(
        "history_start_date",
        item.history_start_date,
    )

    if effective_history_start_date > effective_as_of_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="History start date cannot be after the as-of date.",
        )

    for field, value in values.items():
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
