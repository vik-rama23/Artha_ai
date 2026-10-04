from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.db import models
from app.models.accounts import Account
from app.models.categories import Category
from app.models.transactions import Transaction
from app.schemas.transactions import (
    TransactionCreate,
    TransactionUpdate,
)


# ============================================================
# ACCOUNT BALANCE
# ============================================================


def recalculate_account_balance(
    db: Session,
    account_id: UUID,
) -> Decimal:
    """
    Recalculate an account's current balance from its
    opening balance plus all transactions.
    """

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

    account.current_balance = (
        account.opening_balance
        + balance_change
    )

    return account.current_balance


# ============================================================
# VALIDATE ACCOUNT
# ============================================================


def validate_account(
    db: Session,
    user_id: UUID,
    account_id: UUID,
) -> Account:
    account = (
        db.query(Account)
        .filter(
            Account.id == account_id,
            Account.user_id == user_id,
        )
        .first()
    )

    if account is None:
        raise ValueError(
            "Account does not belong to the authenticated user."
        )

    return account


# ============================================================
# VALIDATE CATEGORY
# ============================================================


def validate_category(
    db: Session,
    user_id: UUID,
    category_id: UUID | None,
    transaction_type: str,
) -> Category | None:
    if category_id is None:
        return None

    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.is_active.is_(True),
        )
        .first()
    )

    if category is None:
        raise ValueError(
            "Category not found or inactive."
        )

    # User categories must belong to the
    # authenticated user.
    #
    # System categories can be shared.
    if (
        not category.is_system
        and category.user_id != user_id
    ):
        raise ValueError(
            "Category does not belong to the authenticated user."
        )

    # Make sure the category type matches
    # the transaction type.
    if category.category_type != transaction_type:
        raise ValueError(
            "Category type does not match transaction type."
        )

    return category


# ============================================================
# CREATE TRANSACTION
# ============================================================


def create_transaction(
    db: Session,
    user_id: UUID,
    transaction_data: TransactionCreate,
) -> Transaction:

    # Make sure all models are loaded into Base.metadata.
    _ = models

    # ---------------------------------------------------------
    # Validate account
    # ---------------------------------------------------------

    account = validate_account(
        db=db,
        user_id=user_id,
        account_id=transaction_data.account_id,
    )

    # ---------------------------------------------------------
    # Validate category
    # ---------------------------------------------------------

    validate_category(
        db=db,
        user_id=user_id,
        category_id=transaction_data.category_id,
        transaction_type=transaction_data.transaction_type,
    )

    # ---------------------------------------------------------
    # Create transaction
    # ---------------------------------------------------------

    transaction = Transaction(
        user_id=user_id,
        account_id=transaction_data.account_id,
        category_id=transaction_data.category_id,
        transaction_type=transaction_data.transaction_type,
        amount=transaction_data.amount,
        transaction_date=transaction_data.transaction_date,
        description=transaction_data.description,
        merchant=transaction_data.merchant,
        notes=transaction_data.notes,
    )

    db.add(transaction)

    # Flush first so the transaction is included when
    # calculating the account balance.
    db.flush()

    # ---------------------------------------------------------
    # Recalculate account balance
    # ---------------------------------------------------------

    recalculate_account_balance(
        db=db,
        account_id=account.id,
    )

    db.commit()
    db.refresh(transaction)

    return transaction


# ============================================================
# GET SINGLE TRANSACTION
# ============================================================


def get_transaction(
    db: Session,
    user_id: UUID,
    transaction_id: UUID,
) -> Transaction:

    transaction = (
        db.query(Transaction)
        .join(
            Account,
            Account.id == Transaction.account_id,
        )
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
            Account.user_id == user_id,
        )
        .first()
    )

    if transaction is None:
        raise ValueError(
            "Transaction not found."
        )

    return transaction


# ============================================================
# UPDATE TRANSACTION
# ============================================================


def update_transaction(
    db: Session,
    user_id: UUID,
    transaction_id: UUID,
    transaction_data: TransactionUpdate,
) -> Transaction:

    transaction = get_transaction(
        db=db,
        user_id=user_id,
        transaction_id=transaction_id,
    )

    old_account_id = transaction.account_id

    # ---------------------------------------------------------
    # Determine final values
    # ---------------------------------------------------------

    new_account_id = (
        transaction_data.account_id
        if transaction_data.account_id is not None
        else transaction.account_id
    )

    new_transaction_type = (
        transaction_data.transaction_type
        if transaction_data.transaction_type is not None
        else transaction.transaction_type
    )

    new_category_id = (
        transaction_data.category_id
        if transaction_data.category_id is not None
        else transaction.category_id
    )

    # ---------------------------------------------------------
    # Validate new account
    # ---------------------------------------------------------

    new_account = validate_account(
        db=db,
        user_id=user_id,
        account_id=new_account_id,
    )

    # ---------------------------------------------------------
    # Validate new category
    # ---------------------------------------------------------

    validate_category(
        db=db,
        user_id=user_id,
        category_id=new_category_id,
        transaction_type=new_transaction_type,
    )

    # ---------------------------------------------------------
    # Apply updates
    # ---------------------------------------------------------

    transaction.account_id = new_account_id
    transaction.category_id = new_category_id
    transaction.transaction_type = (
        new_transaction_type
    )

    if transaction_data.amount is not None:
        transaction.amount = (
            transaction_data.amount
        )

    if transaction_data.transaction_date is not None:
        transaction.transaction_date = (
            transaction_data.transaction_date
        )

    if "description" in transaction_data.model_fields_set:
        transaction.description = (
            transaction_data.description
        )

    if "merchant" in transaction_data.model_fields_set:
        transaction.merchant = (
            transaction_data.merchant
        )

    if "notes" in transaction_data.model_fields_set:
        transaction.notes = (
            transaction_data.notes
        )

    db.flush()

    # ---------------------------------------------------------
    # Recalculate old account
    # ---------------------------------------------------------

    recalculate_account_balance(
        db=db,
        account_id=old_account_id,
    )

    # ---------------------------------------------------------
    # Recalculate new account if changed
    # ---------------------------------------------------------

    if new_account_id != old_account_id:
        recalculate_account_balance(
            db=db,
            account_id=new_account.id,
        )

    db.commit()
    db.refresh(transaction)

    return transaction


# ============================================================
# DELETE TRANSACTION
# ============================================================


def delete_transaction(
    db: Session,
    user_id: UUID,
    transaction_id: UUID,
) -> None:

    transaction = get_transaction(
        db=db,
        user_id=user_id,
        transaction_id=transaction_id,
    )

    account_id = transaction.account_id

    db.delete(transaction)

    db.flush()

    # Recalculate after the transaction has been removed.
    recalculate_account_balance(
        db=db,
        account_id=account_id,
    )

    db.commit()


# ============================================================
# GET TRANSACTIONS
# ============================================================


def get_transactions(
    db: Session,
    user_id: UUID,
    account_id: UUID | None = None,
    category_id: UUID | None = None,
    transaction_type: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Transaction], int]:

    # ---------------------------------------------------------
    # Base query
    # ---------------------------------------------------------

    query = (
        db.query(Transaction)
        .join(
            Account,
            Account.id == Transaction.account_id,
        )
        .filter(
            Transaction.user_id == user_id,
            Account.user_id == user_id,
        )
    )

    # ---------------------------------------------------------
    # Account filter + ownership validation
    # ---------------------------------------------------------

    if account_id is not None:

        account = (
            db.query(Account)
            .filter(
                Account.id == account_id,
                Account.user_id == user_id,
            )
            .first()
        )

        if account is None:
            raise ValueError(
                "Account does not belong to the authenticated user."
            )

        query = query.filter(
            Transaction.account_id == account_id
        )

    # ---------------------------------------------------------
    # Category filter
    # ---------------------------------------------------------

    if category_id is not None:

        query = query.filter(
            Transaction.category_id == category_id
        )

    # ---------------------------------------------------------
    # Transaction type filter
    # ---------------------------------------------------------

    if transaction_type is not None:

        query = query.filter(
            Transaction.transaction_type
            == transaction_type
        )

    # ---------------------------------------------------------
    # Date filters
    # ---------------------------------------------------------

    if start_date is not None:

        query = query.filter(
            Transaction.transaction_date >= start_date
        )

    if end_date is not None:

        query = query.filter(
            Transaction.transaction_date <= end_date
        )

    # ---------------------------------------------------------
    # Search filter
    #
    # Searches both merchant and description.
    # ilike() makes the search case-insensitive.
    # ---------------------------------------------------------

    if search is not None:

        normalized_search = search.strip()

        if normalized_search:

            search_pattern = (
                f"%{normalized_search}%"
            )

            query = query.filter(
                or_(
                    Transaction.merchant.ilike(
                        search_pattern
                    ),
                    Transaction.description.ilike(
                        search_pattern
                    ),
                )
            )

    # ---------------------------------------------------------
    # Total count BEFORE pagination
    # ---------------------------------------------------------

    total = query.count()

    # ---------------------------------------------------------
    # Fetch paginated records
    # ---------------------------------------------------------

    transactions = (
        query
        .order_by(
            Transaction.transaction_date.desc(),
            Transaction.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return transactions, total