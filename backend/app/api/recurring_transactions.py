from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    get_db,
)
from app.models.users import User
from app.schemas.recurring_transactions import (
    RecurringTransactionCreate,
    RecurringTransactionGenerateResponse,
    RecurringTransactionListResponse,
    RecurringTransactionProcessDueResponse,
    RecurringTransactionResponse,
    RecurringTransactionUpdate,
)
from app.services.recurring_transactions import (
    create_recurring_transaction,
    delete_recurring_transaction,
    generate_recurring_transaction,
    get_recurring_transaction_details,
    get_recurring_transaction_list,
    pause_recurring_transaction,
    process_due_recurring_transactions,
    resume_recurring_transaction,
    update_recurring_transaction,
)


router = APIRouter(
    prefix="/api/v1/recurring-transactions",
    tags=["Recurring Transactions"],
)


# ============================================================
# RESPONSE MAPPER
# ============================================================


def to_response(row) -> dict:
    recurring_transaction = row[0]

    return {
        "id": recurring_transaction.id,
        "user_id": recurring_transaction.user_id,
        "account_id": recurring_transaction.account_id,
        "account_name": row.account_name,
        "account_institution_name": (
            row.account_institution_name
        ),
        "category_id": recurring_transaction.category_id,
        "category_name": row.category_name,
        "name": recurring_transaction.name,
        "recurring_type": (
            recurring_transaction.recurring_type
        ),
        "transaction_type": (
            recurring_transaction.transaction_type
        ),
        "amount": recurring_transaction.amount,
        "frequency": recurring_transaction.frequency,
        "start_date": recurring_transaction.start_date,
        "end_date": recurring_transaction.end_date,
        "next_occurrence": (
            recurring_transaction.next_occurrence
        ),
        "last_generated_date": (
            recurring_transaction.last_generated_date
        ),
        "merchant": recurring_transaction.merchant,
        "description": recurring_transaction.description,
        "notes": recurring_transaction.notes,
        "is_active": recurring_transaction.is_active,
        "created_at": recurring_transaction.created_at,
        "updated_at": recurring_transaction.updated_at,
    }


# ============================================================
# CREATE
# ============================================================


@router.post(
    "",
    response_model=RecurringTransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create(
    payload: RecurringTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        recurring_transaction = (
            create_recurring_transaction(
                db=db,
                user_id=current_user.id,
                data=payload,
            )
        )

        row = (
            get_recurring_transaction_details(
                db=db,
                user_id=current_user.id,
                recurring_transaction_id=(
                    recurring_transaction.id
                ),
            )
        )

        return to_response(row)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# LIST
# ============================================================


@router.get(
    "",
    response_model=RecurringTransactionListResponse,
)
def list_recurring_transactions(
    active_only: bool = Query(
        default=False
    ),
    recurring_type: str | None = Query(
        default=None
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        rows, total = (
            get_recurring_transaction_list(
                db=db,
                user_id=current_user.id,
                active_only=active_only,
                recurring_type=recurring_type,
            )
        )

        return {
            "items": [
                to_response(row)
                for row in rows
            ],
            "total": total,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# PROCESS DUE
# ============================================================


@router.post(
    "/process-due",
    response_model=RecurringTransactionProcessDueResponse,
    status_code=status.HTTP_200_OK,
)
def process_due(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = process_due_recurring_transactions(
            db=db,
            user_id=current_user.id,
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# GET SINGLE
# ============================================================


@router.get(
    "/{recurring_transaction_id}",
    response_model=RecurringTransactionResponse,
)
def get_one(
    recurring_transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        row = (
            get_recurring_transaction_details(
                db=db,
                user_id=current_user.id,
                recurring_transaction_id=(
                    recurring_transaction_id
                ),
            )
        )

        return to_response(row)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


# ============================================================
# UPDATE
# ============================================================


@router.patch(
    "/{recurring_transaction_id}",
    response_model=RecurringTransactionResponse,
)
def update(
    recurring_transaction_id: UUID,
    payload: RecurringTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        update_recurring_transaction(
            db=db,
            user_id=current_user.id,
            recurring_transaction_id=(
                recurring_transaction_id
            ),
            data=payload,
        )

        row = (
            get_recurring_transaction_details(
                db=db,
                user_id=current_user.id,
                recurring_transaction_id=(
                    recurring_transaction_id
                ),
            )
        )

        return to_response(row)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# DELETE
# ============================================================


@router.delete(
    "/{recurring_transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete(
    recurring_transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        delete_recurring_transaction(
            db=db,
            user_id=current_user.id,
            recurring_transaction_id=(
                recurring_transaction_id
            ),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


# ============================================================
# PAUSE
# ============================================================


@router.post(
    "/{recurring_transaction_id}/pause",
    response_model=RecurringTransactionResponse,
)
def pause(
    recurring_transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        pause_recurring_transaction(
            db=db,
            user_id=current_user.id,
            recurring_transaction_id=(
                recurring_transaction_id
            ),
        )

        row = (
            get_recurring_transaction_details(
                db=db,
                user_id=current_user.id,
                recurring_transaction_id=(
                    recurring_transaction_id
                ),
            )
        )

        return to_response(row)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


# ============================================================
# RESUME
# ============================================================


@router.post(
    "/{recurring_transaction_id}/resume",
    response_model=RecurringTransactionResponse,
)
def resume(
    recurring_transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        resume_recurring_transaction(
            db=db,
            user_id=current_user.id,
            recurring_transaction_id=(
                recurring_transaction_id
            ),
        )

        row = (
            get_recurring_transaction_details(
                db=db,
                user_id=current_user.id,
                recurring_transaction_id=(
                    recurring_transaction_id
                ),
            )
        )

        return to_response(row)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# GENERATE
# ============================================================


@router.post(
    "/{recurring_transaction_id}/generate",
    response_model=RecurringTransactionGenerateResponse,
)
def generate(
    recurring_transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        (
            recurring_transaction,
            transaction,
        ) = generate_recurring_transaction(
            db=db,
            user_id=current_user.id,
            recurring_transaction_id=(
                recurring_transaction_id
            ),
        )

        return {
            "recurring_transaction_id": (
                recurring_transaction.id
            ),
            "generated_transaction_id": (
                transaction.id
            ),
            "generated_transaction_date": (
                transaction.transaction_date
            ),
            "generated_amount": (
                transaction.amount
            ),
            "next_occurrence": (
                recurring_transaction.next_occurrence
            ),
            "is_active": (
                recurring_transaction.is_active
            ),
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc