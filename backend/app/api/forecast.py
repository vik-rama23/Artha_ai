from datetime import date

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.users import User
from app.schemas.cash_flow_forecast import CashFlowForecastResponse
from app.services.cash_flow_forecast import get_cash_flow_forecast


router = APIRouter(
    prefix="/api/v1/forecast",
    tags=["Forecast"],
)


@router.get(
    "/cash-flow",
    response_model=CashFlowForecastResponse,
    status_code=status.HTTP_200_OK,
)
def cash_flow_forecast(
    forecast_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_cash_flow_forecast(
        db=db,
        user_id=current_user.id,
        forecast_date=forecast_date,
    )
