from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    get_db,
)
from app.models.users import User
from app.schemas.categories import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdate,
)
from app.services.categories import (
    create_category,
    delete_category,
    get_categories,
    get_category,
    update_category,
)


router = APIRouter(
    prefix="/api/v1/categories",
    tags=["Categories"],
)


@router.get(
    "",
    response_model=CategoryListResponse,
    status_code=status.HTTP_200_OK,
)
def list_categories(
    category_type: str | None = None,
    include_inactive: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    categories = get_categories(
        db=db,
        user_id=current_user.id,
        category_type=category_type,
        include_inactive=include_inactive,
    )

    return CategoryListResponse(
        items=categories,
        total=len(categories),
    )


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
    status_code=status.HTTP_200_OK,
)
def get_category_by_id(
    category_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_category(
        db=db,
        user_id=current_user.id,
        category_id=category_id,
    )


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_category(
    payload: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_category(
        db=db,
        user_id=current_user.id,
        payload=payload,
    )


@router.patch(
    "/{category_id}",
    response_model=CategoryResponse,
    status_code=status.HTTP_200_OK,
)
def update_existing_category(
    category_id: UUID,
    payload: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_category(
        db=db,
        user_id=current_user.id,
        category_id=category_id,
        payload=payload,
    )


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_category(
    category_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_category(
        db=db,
        user_id=current_user.id,
        category_id=category_id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )