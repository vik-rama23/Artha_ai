import csv
from datetime import date
from io import StringIO
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    get_db,
)
from app.models.accounts import Account
from app.models.categories import Category
from app.models.transactions import Transaction
from app.models.users import User
from app.schemas.transactions import (
    TransactionCreate,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.transactions import (
    create_transaction,
    delete_transaction,
    get_transaction,
    get_transactions,
    update_transaction,
)


router = APIRouter(
    prefix="/api/v1/transactions",
    tags=["Transactions"],
)


# ============================================================
# RESPONSE BUILDER
# ============================================================


def build_transaction_response(
    db: Session,
    transaction,
) -> TransactionResponse:
    account = (
        db.query(Account)
        .filter(
            Account.id == transaction.account_id,
            Account.user_id == transaction.user_id,
        )
        .first()
    )

    if account is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transaction account could not be loaded.",
        )

    category = None

    if transaction.category_id is not None:
        category = (
            db.query(Category)
            .filter(Category.id == transaction.category_id)
            .first()
        )

    return TransactionResponse(
        id=transaction.id,
        user_id=transaction.user_id,
        account_id=transaction.account_id,
        account_name=account.name,
        account_institution_name=account.institution_name,
        category_id=transaction.category_id,
        category_name=category.name if category is not None else "Uncategorized",
        recurring_transaction_id=transaction.recurring_transaction_id,
        transaction_type=transaction.transaction_type,
        amount=transaction.amount,
        transaction_date=transaction.transaction_date,
        description=transaction.description,
        merchant=transaction.merchant,
        notes=transaction.notes,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
    )


def _csv_safe_text(value: str | None) -> str:
    """Prevent spreadsheet formula execution for user-controlled text cells."""
    text_value = value or ""
    if text_value.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + text_value
    return text_value


# ============================================================
# EXPORT TRANSACTIONS AS CSV
# Keep this route before /{transaction_id}, since "export" is a
# literal path segment and must not be parsed as a transaction UUID.
# ============================================================


@router.get(
    "/export",
    response_class=Response,
    status_code=status.HTTP_200_OK,
)
def export_transactions_csv(
    account_id: UUID | None = None,
    category_id: UUID | None = None,
    transaction_type: str | None = Query(
        default=None,
        pattern="^(INCOME|EXPENSE)$",
    ),
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = Query(default=None, max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date cannot be after end_date.",
        )

    query = (
        db.query(Transaction, Account.name, Account.currency, Category.name)
        .join(Account, Account.id == Transaction.account_id)
        .outerjoin(Category, Category.id == Transaction.category_id)
        .filter(
            Transaction.user_id == current_user.id,
            Account.user_id == current_user.id,
        )
    )

    if account_id is not None:
        query = query.filter(Transaction.account_id == account_id)
    if category_id is not None:
        query = query.filter(Transaction.category_id == category_id)
    if transaction_type is not None:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if start_date is not None:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date is not None:
        query = query.filter(Transaction.transaction_date <= end_date)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.filter(
            Transaction.description.ilike(pattern)
            | Transaction.merchant.ilike(pattern)
        )

    rows = query.order_by(
        Transaction.transaction_date.desc(),
        Transaction.created_at.desc(),
    ).all()

    output = StringIO(newline="")
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow([
        "transaction_id",
        "transaction_date",
        "transaction_type",
        "amount",
        "currency",
        "account",
        "category",
        "merchant",
        "description",
        "notes",
    ])

    for transaction, account_name, account_currency, category_name in rows:
        writer.writerow([
            str(transaction.id),
            transaction.transaction_date.isoformat(),
            transaction.transaction_type,
            format(transaction.amount, ".2f"),
            account_currency,
            _csv_safe_text(account_name),
            _csv_safe_text(category_name or "Uncategorized"),
            _csv_safe_text(transaction.merchant),
            _csv_safe_text(transaction.description),
            _csv_safe_text(transaction.notes),
        ])

    filename = f"artha-transactions-{date.today().isoformat()}.csv"
    return Response(
        content="\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


# ============================================================
# CREATE TRANSACTION
# ============================================================


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction_endpoint(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        transaction = create_transaction(
            db=db,
            user_id=current_user.id,
            transaction_data=transaction_data,
        )
        return build_transaction_response(db=db, transaction=transaction)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# GET SINGLE TRANSACTION
# ============================================================


@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse,
    status_code=status.HTTP_200_OK,
)
def get_transaction_endpoint(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        transaction = get_transaction(
            db=db,
            user_id=current_user.id,
            transaction_id=transaction_id,
        )
        return build_transaction_response(db=db, transaction=transaction)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


# ============================================================
# UPDATE TRANSACTION
# ============================================================


@router.patch(
    "/{transaction_id}",
    response_model=TransactionResponse,
    status_code=status.HTTP_200_OK,
)
def update_transaction_endpoint(
    transaction_id: UUID,
    transaction_data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        transaction = update_transaction(
            db=db,
            user_id=current_user.id,
            transaction_id=transaction_id,
            transaction_data=transaction_data,
        )
        return build_transaction_response(db=db, transaction=transaction)
    except ValueError as exc:
        message = str(exc)
        if message == "Transaction not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        ) from exc


# ============================================================
# DELETE TRANSACTION
# ============================================================


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_transaction_endpoint(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        delete_transaction(
            db=db,
            user_id=current_user.id,
            transaction_id=transaction_id,
        )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


# ============================================================
# GET TRANSACTIONS
# ============================================================


@router.get(
    "",
    response_model=TransactionListResponse,
    status_code=status.HTTP_200_OK,
)
def list_transactions(
    account_id: UUID | None = None,
    category_id: UUID | None = None,
    transaction_type: str | None = Query(
        default=None,
        pattern="^(INCOME|EXPENSE)$",
    ),
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date cannot be after end_date.",
        )

    try:
        transactions, total = get_transactions(
            db=db,
            user_id=current_user.id,
            account_id=account_id,
            category_id=category_id,
            transaction_type=transaction_type,
            start_date=start_date,
            end_date=end_date,
            search=search,
            limit=limit,
            offset=offset,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    items: list[TransactionResponse] = []
    for transaction in transactions:
        try:
            items.append(build_transaction_response(db=db, transaction=transaction))
        except HTTPException:
            continue

    return TransactionListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )
