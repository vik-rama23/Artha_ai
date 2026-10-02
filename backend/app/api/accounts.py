from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    get_db,
)
from app.models.accounts import Account
from app.models.users import User
from app.schemas.accounts import (
    AccountCreate,
    AccountResponse,
    AccountUpdate,
)
from app.services.accounts import (
    calculate_account_balance,
    create_account,
    delete_account,
    get_account,
    get_account_balance,
    get_accounts,
    update_account,
)


router = APIRouter(
    prefix="/api/v1/accounts",
    tags=["Accounts"],
)


@router.get(
    "",
    response_model=list[AccountResponse],
    status_code=status.HTTP_200_OK,
)
def list_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accounts = get_accounts(
        db=db,
        user_id=current_user.id,
    )

    for account in accounts:
        account.current_balance = calculate_account_balance(
            db=db,
            account=account,
        )

    return accounts


@router.get(
    "/{account_id}/balance",
    status_code=status.HTTP_200_OK,
)
def account_balance(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify that this account belongs to the
    # authenticated user before returning its balance.
    account = get_account(
        db=db,
        user_id=current_user.id,
        account_id=account_id,
    )

    try:
        balance = get_account_balance(
            db=db,
            account_id=account.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return {
        "account_id": account.id,
        "balance": balance,
        "currency": account.currency,
    }


@router.get(
    "/{account_id}",
    response_model=AccountResponse,
    status_code=status.HTTP_200_OK,
)
def get_account_by_id(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = get_account(
        db=db,
        user_id=current_user.id,
        account_id=account_id,
    )

    account.current_balance = calculate_account_balance(
        db=db,
        account=account,
    )

    return account


@router.post(
    "",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_account(
    payload: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_account(
        db=db,
        user_id=current_user.id,
        payload=payload,
    )


@router.patch(
    "/{account_id}",
    response_model=AccountResponse,
    status_code=status.HTTP_200_OK,
)
def update_existing_account(
    account_id: UUID,
    payload: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_account(
        db=db,
        user_id=current_user.id,
        account_id=account_id,
        payload=payload,
    )


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_account(
        db=db,
        user_id=current_user.id,
        account_id=account_id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )