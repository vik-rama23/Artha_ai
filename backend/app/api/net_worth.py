from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.users import User
from app.schemas.net_worth import (
    NetWorthItemCreate,
    NetWorthItemResponse,
    NetWorthItemUpdate,
    NetWorthResponse,
)
from app.services.net_worth import (
    create_net_worth_item,
    delete_net_worth_item,
    get_net_worth,
    get_net_worth_items,
    update_net_worth_item,
)


router = APIRouter(
    prefix="/api/v1/net-worth",
    tags=["Net Worth"],
)


@router.get(
    "",
    response_model=NetWorthResponse,
    status_code=status.HTTP_200_OK,
)
def net_worth(
    as_of_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_net_worth(
        db=db,
        user_id=current_user.id,
        as_of_date=as_of_date,
    )


@router.get(
    "/items",
    response_model=list[NetWorthItemResponse],
    status_code=status.HTTP_200_OK,
)
def list_net_worth_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_net_worth_items(
        db=db,
        user_id=current_user.id,
    )


@router.post(
    "/items",
    response_model=NetWorthItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_net_worth_item_endpoint(
    payload: NetWorthItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_net_worth_item(
        db=db,
        user_id=current_user.id,
        payload=payload,
    )


@router.patch(
    "/items/{item_id}",
    response_model=NetWorthItemResponse,
    status_code=status.HTTP_200_OK,
)
def update_net_worth_item_endpoint(
    item_id: UUID,
    payload: NetWorthItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_net_worth_item(
        db=db,
        user_id=current_user.id,
        item_id=item_id,
        payload=payload,
    )


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_net_worth_item_endpoint(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_net_worth_item(
        db=db,
        user_id=current_user.id,
        item_id=item_id,
    )
