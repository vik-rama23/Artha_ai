from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.goals import Goal, GoalContribution
from app.schemas.goals import (
    GoalContributionCreate,
    GoalCreate,
    GoalUpdate,
)


# ============================================================
# HELPERS
# ============================================================


def get_goal(
    db: Session,
    user_id: UUID,
    goal_id: UUID,
) -> Goal:
    """
    Get a goal belonging to the specified user.
    """

    goal = (
        db.query(Goal)
        .filter(
            Goal.id == goal_id,
            Goal.user_id == user_id,
        )
        .first()
    )

    if goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found.",
        )

    return goal


def validate_target_amount(
    target_amount: Decimal,
    current_amount: Decimal,
) -> None:
    """
    Ensure the current amount does not exceed the target.
    """

    if current_amount > target_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Current amount cannot be greater than "
                "target amount."
            ),
        )


def update_completion_status(goal: Goal) -> None:
    """
    Mark the goal as completed when the current amount
    reaches or exceeds the target amount.
    """

    goal.is_completed = (
        goal.current_amount >= goal.target_amount
    )


# ============================================================
# CREATE GOAL
# ============================================================


def create_goal(
    db: Session,
    user_id: UUID,
    data: GoalCreate,
) -> Goal:
    """
    Create a new financial goal.
    """

    validate_target_amount(
        target_amount=data.target_amount,
        current_amount=data.current_amount,
    )

    goal = Goal(
        user_id=user_id,
        name=data.name.strip(),
        description=data.description,
        target_amount=data.target_amount,
        current_amount=data.current_amount,
        target_date=data.target_date,
        icon=data.icon,
    )

    update_completion_status(goal)

    db.add(goal)
    db.commit()
    db.refresh(goal)

    return goal


# ============================================================
# GET GOAL
# ============================================================


def get_goal_by_id(
    db: Session,
    user_id: UUID,
    goal_id: UUID,
) -> Goal:
    """
    Return one goal belonging to the user.
    """

    return get_goal(
        db=db,
        user_id=user_id,
        goal_id=goal_id,
    )


# ============================================================
# LIST GOALS
# ============================================================


def get_goals(
    db: Session,
    user_id: UUID,
) -> tuple[list[Goal], int]:
    """
    Return all goals belonging to the user.
    """

    query = (
        db.query(Goal)
        .filter(
            Goal.user_id == user_id,
        )
    )

    total = query.count()

    goals = (
        query
        .order_by(
            Goal.is_completed.asc(),
            Goal.target_date.asc().nulls_last(),
            Goal.created_at.desc(),
        )
        .all()
    )

    return goals, total


# ============================================================
# UPDATE GOAL
# ============================================================


def update_goal(
    db: Session,
    user_id: UUID,
    goal_id: UUID,
    data: GoalUpdate,
) -> Goal:
    """
    Update a financial goal.
    """

    goal = get_goal(
        db=db,
        user_id=user_id,
        goal_id=goal_id,
    )

    update_data = data.model_dump(
        exclude_unset=True,
    )

    if not update_data:
        return goal

    new_target_amount = update_data.get(
        "target_amount",
        goal.target_amount,
    )

    new_current_amount = update_data.get(
        "current_amount",
        goal.current_amount,
    )

    validate_target_amount(
        target_amount=new_target_amount,
        current_amount=new_current_amount,
    )

    if "name" in update_data:
        name = update_data["name"]

        if name is not None:
            name = name.strip()

            if not name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Goal name cannot be empty.",
                )

            goal.name = name

    if "description" in update_data:
        goal.description = update_data["description"]

    if "target_amount" in update_data:
        goal.target_amount = new_target_amount

    if "current_amount" in update_data:
        goal.current_amount = new_current_amount

    if "target_date" in update_data:
        goal.target_date = update_data["target_date"]

    if "icon" in update_data:
        goal.icon = update_data["icon"]

    # Completion is derived from the financial state.
    #
    # We intentionally do not allow the request to arbitrarily
    # mark a goal completed if the target has not been reached.
    update_completion_status(goal)

    db.commit()
    db.refresh(goal)

    return goal


# ============================================================
# DELETE GOAL
# ============================================================


def delete_goal(
    db: Session,
    user_id: UUID,
    goal_id: UUID,
) -> None:
    """
    Delete a goal belonging to the user.

    Goal contributions are deleted automatically by the
    database because the foreign key uses ON DELETE CASCADE.
    """

    goal = get_goal(
        db=db,
        user_id=user_id,
        goal_id=goal_id,
    )

    db.delete(goal)
    db.commit()


# ============================================================
# CREATE CONTRIBUTION
# ============================================================


def create_goal_contribution(
    db: Session,
    user_id: UUID,
    goal_id: UUID,
    data: GoalContributionCreate,
) -> GoalContribution:
    """
    Add a contribution to a goal and update its current amount.
    """

    goal = get_goal(
        db=db,
        user_id=user_id,
        goal_id=goal_id,
    )

    if goal.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This goal has already been completed.",
        )

    new_current_amount = (
        goal.current_amount + data.amount
    )

    if new_current_amount > goal.target_amount:
        remaining_amount = (
            goal.target_amount - goal.current_amount
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Contribution exceeds the remaining goal amount. "
                f"Maximum allowed contribution is "
                f"{remaining_amount:.2f}."
            ),
        )

    contribution = GoalContribution(
        goal_id=goal.id,
        amount=data.amount,
        contribution_date=data.contribution_date,
        notes=data.notes,
    )

    goal.current_amount = new_current_amount

    update_completion_status(goal)

    db.add(contribution)
    db.commit()
    db.refresh(contribution)

    return contribution


# ============================================================
# GET CONTRIBUTIONS
# ============================================================


def get_goal_contributions(
    db: Session,
    user_id: UUID,
    goal_id: UUID,
) -> tuple[list[GoalContribution], int]:
    """
    Return all contributions for a goal belonging to the user.
    """

    # This also validates goal ownership.
    goal = get_goal(
        db=db,
        user_id=user_id,
        goal_id=goal_id,
    )

    query = (
        db.query(GoalContribution)
        .filter(
            GoalContribution.goal_id == goal.id,
        )
    )

    total = query.count()

    contributions = (
        query
        .order_by(
            GoalContribution.contribution_date.desc(),
            GoalContribution.created_at.desc(),
        )
        .all()
    )

    return contributions, total


# ============================================================
# GET GOAL WITH CONTRIBUTIONS
# ============================================================


def get_goal_details(
    db: Session,
    user_id: UUID,
    goal_id: UUID,
) -> tuple[Goal, list[GoalContribution]]:
    """
    Return a goal together with its contribution history.
    """

    goal = get_goal(
        db=db,
        user_id=user_id,
        goal_id=goal_id,
    )

    contributions = (
        db.query(GoalContribution)
        .filter(
            GoalContribution.goal_id == goal.id,
        )
        .order_by(
            GoalContribution.contribution_date.desc(),
            GoalContribution.created_at.desc(),
        )
        .all()
    )

    return goal, contributions