from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.accounts import Account
from app.models.transactions import Transaction
from app.schemas.accounts import (
    AccountCreate,
    AccountUpdate,
)


def get_account_balance(
    db: Session,
    account_id: UUID,
) -> Decimal:
    account = (
        db.query(Account)
        .filter(Account.id == account_id)
        .first()
    )

    if account is None:
        raise ValueError("Account not found.")

    balance_change = (
        db.query(
            func.coalesce(
                func.sum(
                    case(
                        (
                            Transaction.transaction_type
                            == "INCOME",
                            Transaction.amount,
                        ),
                        (
                            Transaction.transaction_type
                            == "EXPENSE",
                            -Transaction.amount,
                        ),
                        else_=Decimal("0.00"),
                    )
                ),
                Decimal("0.00"),
            )
        )
        .filter(
            Transaction.account_id == account_id
        )
        .scalar()
    )

    return (
        account.opening_balance
        + balance_change
    )


def calculate_account_balance(
    db: Session,
    account: Account,
) -> Decimal:
    return get_account_balance(
        db=db,
        account_id=account.id,
    )


def get_accounts(
    db: Session,
    user_id: UUID,
) -> list[Account]:
    statement = (
        select(Account)
        .where(
            Account.user_id == user_id
        )
        .order_by(
            Account.created_at.desc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


def get_account(
    db: Session,
    user_id: UUID,
    account_id: UUID,
) -> Account:
    account = db.scalar(
        select(Account)
        .where(
            Account.id == account_id
        )
        .where(
            Account.user_id == user_id
        )
    )

    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    return account


def create_account(
    db: Session,
    user_id: UUID,
    payload: AccountCreate,
) -> Account:
    account = Account(
        user_id=user_id,
        name=payload.name,
        account_type=payload.account_type,
        institution_name=payload.institution_name,
        account_number_last4=(
            payload.account_number_last4
        ),
        opening_balance=payload.opening_balance,
        current_balance=payload.opening_balance,
        currency=payload.currency.upper(),
        notes=payload.notes,
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    return account


def update_account(
    db: Session,
    user_id: UUID,
    account_id: UUID,
    payload: AccountUpdate,
) -> Account:
    account = get_account(
        db=db,
        user_id=user_id,
        account_id=account_id,
    )

    updates = payload.model_dump(
        exclude_unset=True
    )

    for field, value in updates.items():
        if field == "currency" and value:
            value = value.upper()

        setattr(
            account,
            field,
            value,
        )

    account.current_balance = (
        calculate_account_balance(
            db=db,
            account=account,
        )
    )

    db.commit()
    db.refresh(account)

    return account


def delete_account(
    db: Session,
    user_id: UUID,
    account_id: UUID,
) -> None:
    account = get_account(
        db=db,
        user_id=user_id,
        account_id=account_id,
    )

    transaction_exists = db.scalar(
        select(Transaction.id)
        .where(
            Transaction.account_id == account.id
        )
        .limit(1)
    )

    if transaction_exists is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Account cannot be deleted "
                "because it has transactions."
            ),
        )

    db.delete(account)
    db.commit()