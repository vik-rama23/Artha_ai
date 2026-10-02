from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.users import User
from app.schemas.budgets import (
    BudgetCreate,
    BudgetListResponse,
    BudgetResponse,
    BudgetUpdate,
)
from app.services.budgets import (
    create_budget,
    delete_budget,
    get_budget,
    get_budget_response,
    list_budgets,
    update_budget,
)


router = APIRouter(
    prefix="/api/v1/budgets",
    tags=["Budgets"],
)


@router.post(
    "",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_budget_endpoint(
    payload: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_budget(
        db=db,
        user_id=current_user.id,
        budget_data=payload,
    )


@router.get(
    "",
    response_model=BudgetListResponse,
    status_code=status.HTTP_200_OK,
)
def list_budgets_endpoint(
    month_start: date | None = Query(
        default=None,
        description="Any date in the month to filter budgets.",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = list_budgets(
        db=db,
        user_id=current_user.id,
        month_start=month_start,
    )

    return {
        "items": items,
        "total": total,
    }


@router.get(
    "/{budget_id}",
    response_model=BudgetResponse,
    status_code=status.HTTP_200_OK,
)
def get_budget_endpoint(
    budget_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = get_budget(
        db=db,
        user_id=current_user.id,
        budget_id=budget_id,
    )

    return get_budget_response(
        db=db,
        budget=budget,
    )


@router.patch(
    "/{budget_id}",
    response_model=BudgetResponse,
    status_code=status.HTTP_200_OK,
)
def update_budget_endpoint(
    budget_id: UUID,
    payload: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_budget(
        db=db,
        user_id=current_user.id,
        budget_id=budget_id,
        budget_data=payload,
    )


@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_budget_endpoint(
    budget_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_budget(
        db=db,
        user_id=current_user.id,
        budget_id=budget_id,
    )

    return None