from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.users import User
from app.schemas.top_transactions import TopTransactionsResponse
from app.services.top_transactions import get_top_transactions


router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


@router.get(
    "/top-transactions",
    response_model=TopTransactionsResponse,
    status_code=status.HTTP_200_OK,
)
def top_transactions(
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(
        default=5,
        ge=1,
        le=50,
    ),
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if (
        start_date is not None
        and end_date is not None
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "start_date cannot be after "
                "end_date."
            ),
        )

    result = get_top_transactions(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )

    return TopTransactionsResponse(
        **result
    )