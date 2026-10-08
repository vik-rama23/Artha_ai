from datetime import date

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
from app.schemas.analytics import (
    AnalyticsComparisonResponse,
    CategoryTrendsResponse,
    ExpenseByCategoryResponse,
    IncomeExpenseSummaryResponse,
    MonthlyCashFlowResponse,
    TopTransactionsResponse,
    SavingsTrendResponse,
    AnalyticsInsightsResponse,
    BudgetVsActualResponse,
)
from app.services.analytics import (
    get_analytics_comparison,
    get_category_trends,
    get_expenses_by_category,
    get_income_expense_summary,
    get_monthly_cash_flow,
    get_top_transactions,
    get_savings_trend,
    get_analytics_insights,
    get_budget_vs_actual,
)


router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


def validate_date_range(
    start_date: date | None,
    end_date: date | None,
) -> None:
    if (
        start_date is not None
        and end_date is not None
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date cannot be after end_date.",
        )


@router.get(
    "/summary",
    response_model=IncomeExpenseSummaryResponse,
    status_code=status.HTTP_200_OK,
)
def income_expense_summary(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    validate_date_range(
        start_date=start_date,
        end_date=end_date,
    )

    summary = get_income_expense_summary(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )

    return IncomeExpenseSummaryResponse(
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        income=summary["income"],
        expense=summary["expense"],
        net=summary["net"],
    )


@router.get(
    "/expenses-by-category",
    response_model=ExpenseByCategoryResponse,
    status_code=status.HTTP_200_OK,
)
def expenses_by_category(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    validate_date_range(
        start_date=start_date,
        end_date=end_date,
    )

    result = get_expenses_by_category(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )

    return ExpenseByCategoryResponse(
        start_date=result["start_date"],
        end_date=result["end_date"],
        total_expense=result["total_expense"],
        items=result["items"],
    )


@router.get(
    "/monthly",
    response_model=MonthlyCashFlowResponse,
    status_code=status.HTTP_200_OK,
)
def monthly_cash_flow(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    validate_date_range(
        start_date=start_date,
        end_date=end_date,
    )

    result = get_monthly_cash_flow(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )

    return MonthlyCashFlowResponse(
        start_date=result["start_date"],
        end_date=result["end_date"],
        items=result["items"],
    )


@router.get(
    "/comparison",
    response_model=AnalyticsComparisonResponse,
    status_code=status.HTTP_200_OK,
)
def analytics_comparison(
    current_start_date: date,
    current_end_date: date,
    previous_start_date: date,
    previous_end_date: date,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    validate_date_range(
        start_date=current_start_date,
        end_date=current_end_date,
    )

    validate_date_range(
        start_date=previous_start_date,
        end_date=previous_end_date,
    )

    result = get_analytics_comparison(
        db=db,
        user_id=current_user.id,
        current_start_date=current_start_date,
        current_end_date=current_end_date,
        previous_start_date=previous_start_date,
        previous_end_date=previous_end_date,
    )

    return AnalyticsComparisonResponse(
        **result
    )


@router.get(
    "/category-trends",
    response_model=CategoryTrendsResponse,
    status_code=status.HTTP_200_OK,
)
def category_trends(
    current_start_date: date,
    current_end_date: date,
    previous_start_date: date,
    previous_end_date: date,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    validate_date_range(
        start_date=current_start_date,
        end_date=current_end_date,
    )

    validate_date_range(
        start_date=previous_start_date,
        end_date=previous_end_date,
    )

    result = get_category_trends(
        db=db,
        user_id=current_user.id,
        current_start_date=current_start_date,
        current_end_date=current_end_date,
        previous_start_date=previous_start_date,
        previous_end_date=previous_end_date,
    )

    return CategoryTrendsResponse(
        **result
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
    validate_date_range(
        start_date=start_date,
        end_date=end_date,
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

@router.get(
    "/savings-trend",
    response_model=SavingsTrendResponse,
    status_code=status.HTTP_200_OK,
)
def savings_trend(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    validate_date_range(
        start_date=start_date,
        end_date=end_date,
    )

    result = get_savings_trend(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )

    return SavingsTrendResponse(
        **result
    )

@router.get(
    "/insights",
    response_model=AnalyticsInsightsResponse,
    status_code=status.HTTP_200_OK,
)
def analytics_insights(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    validate_date_range(
        start_date=start_date,
        end_date=end_date,
    )

    result = get_analytics_insights(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )

    return AnalyticsInsightsResponse(
        **result
    )


@router.get(
    "/budget-vs-actual",
    response_model=BudgetVsActualResponse,
    status_code=status.HTTP_200_OK,
)
def budget_vs_actual(
    month_start: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_budget_vs_actual(
        db=db,
        user_id=current_user.id,
        month_start=month_start,
    )
