from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
    get_db,
)
from app.models.users import User
from app.schemas.goals import (
    GoalContributionCreate,
    GoalContributionListResponse,
    GoalContributionResponse,
    GoalCreate,
    GoalDetailResponse,
    GoalListResponse,
    GoalResponse,
    GoalUpdate,
)
from app.services.goals import (
    create_goal,
    create_goal_contribution,
    delete_goal,
    get_goal_by_id,
    get_goal_contributions,
    get_goal_details,
    get_goals,
    update_goal,
)


router = APIRouter(
    prefix="/api/v1/goals",
    tags=["Goals"],
)


# ============================================================
# CREATE GOAL
# ============================================================


@router.post(
    "",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_goal_endpoint(
    data: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new financial goal for the authenticated user.
    """

    return create_goal(
        db=db,
        user_id=current_user.id,
        data=data,
    )


# ============================================================
# LIST GOALS
# ============================================================


@router.get(
    "",
    response_model=GoalListResponse,
)
def list_goals_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all financial goals belonging to the authenticated user.
    """

    goals, total = get_goals(
        db=db,
        user_id=current_user.id,
    )

    return GoalListResponse(
        items=goals,
        total=total,
    )


# ============================================================
# GET GOAL DETAILS
# ============================================================


@router.get(
    "/{goal_id}/details",
    response_model=GoalDetailResponse,
)
def get_goal_details_endpoint(
    goal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return a goal together with its contribution history.
    """

    goal, contributions = get_goal_details(
        db=db,
        user_id=current_user.id,
        goal_id=goal_id,
    )

    return GoalDetailResponse(
        id=goal.id,
        user_id=goal.user_id,
        name=goal.name,
        description=goal.description,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        target_date=goal.target_date,
        icon=goal.icon,
        is_completed=goal.is_completed,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        contributions=contributions,
    )


# ============================================================
# GET SINGLE GOAL
# ============================================================


@router.get(
    "/{goal_id}",
    response_model=GoalResponse,
)
def get_goal_endpoint(
    goal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return a single goal belonging to the authenticated user.
    """

    return get_goal_by_id(
        db=db,
        user_id=current_user.id,
        goal_id=goal_id,
    )


# ============================================================
# UPDATE GOAL
# ============================================================


@router.patch(
    "/{goal_id}",
    response_model=GoalResponse,
)
def update_goal_endpoint(
    goal_id: UUID,
    data: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a financial goal.
    """

    return update_goal(
        db=db,
        user_id=current_user.id,
        goal_id=goal_id,
        data=data,
    )


# ============================================================
# DELETE GOAL
# ============================================================


@router.delete(
    "/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_goal_endpoint(
    goal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a financial goal and its contribution history.
    """

    delete_goal(
        db=db,
        user_id=current_user.id,
        goal_id=goal_id,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================
# ADD CONTRIBUTION
# ============================================================


@router.post(
    "/{goal_id}/contributions",
    response_model=GoalContributionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_goal_contribution_endpoint(
    goal_id: UUID,
    data: GoalContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a contribution to a financial goal.
    """

    return create_goal_contribution(
        db=db,
        user_id=current_user.id,
        goal_id=goal_id,
        data=data,
    )


# ============================================================
# LIST CONTRIBUTIONS
# ============================================================


@router.get(
    "/{goal_id}/contributions",
    response_model=GoalContributionListResponse,
)
def list_goal_contributions_endpoint(
    goal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return contribution history for a goal.
    """

    contributions, total = get_goal_contributions(
        db=db,
        user_id=current_user.id,
        goal_id=goal_id,
    )

    return GoalContributionListResponse(
        items=contributions,
        total=total,
    )