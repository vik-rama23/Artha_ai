from calendar import monthrange
from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    get_db,
)
from app.models.users import User
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard import get_dashboard


router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["Dashboard"],
)


@router.get(
    "",
    response_model=DashboardResponse,
    status_code=status.HTTP_200_OK,
)
def dashboard(
    start_date: date | None = None,
    end_date: date | None = None,
    month: str | None = None,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------
    # Month filter
    #
    # Example:
    # ?month=2026-10
    # --------------------------------------------------

    if month is not None:
        try:
            year_text, month_text = month.split(
                "-"
            )

            year = int(year_text)
            month_number = int(month_text)

            if not (
                1 <= month_number <= 12
            ):
                raise ValueError

            selected_start_date = date(
                year,
                month_number,
                1,
            )

            last_day = monthrange(
                year,
                month_number,
            )[1]

            selected_end_date = date(
                year,
                month_number,
                last_day,
            )

        except (
            ValueError,
            TypeError,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "month must be in YYYY-MM format."
                ),
            )

        return get_dashboard(
            db=db,
            user_id=current_user.id,
            start_date=selected_start_date,
            end_date=selected_end_date,
        )

    # --------------------------------------------------
    # Existing explicit date filtering
    # --------------------------------------------------

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

    return get_dashboard(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )