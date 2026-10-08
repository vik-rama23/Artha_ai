import calendar
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.budgets import Budget
from app.models.categories import Category
from app.models.transactions import Transaction
from app.schemas.budgets import BudgetCreate, BudgetUpdate


TWO_DECIMAL_PLACES = Decimal("0.01")


def money(value: Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0.00")

    return Decimal(value).quantize(
        TWO_DECIMAL_PLACES,
        rounding=ROUND_HALF_UP,
    )


def normalize_month_start(value: date) -> date:
    return date(
        value.year,
        value.month,
        1,
    )


def get_month_end(month_start: date) -> date:
    last_day = calendar.monthrange(
        month_start.year,
        month_start.month,
    )[1]

    return date(
        month_start.year,
        month_start.month,
        last_day,
    )


def get_spending_for_budget(
    db: Session,
    user_id: UUID,
    category_id: UUID | None,
    month_start: date,
    month_end: date,
) -> Decimal:
    query = (
        db.query(
            func.coalesce(
                func.sum(Transaction.amount),
                Decimal("0.00"),
            )
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "EXPENSE",
            Transaction.transaction_date >= month_start,
            Transaction.transaction_date <= month_end,
        )
    )

    if category_id is None:
        # Overall budget:
        # all expense transactions for this user.
        pass
    else:
        query = query.filter(
            Transaction.category_id == category_id
        )

    result = query.scalar()

    return money(result)


def get_days_in_month(month_start: date) -> int:
    return calendar.monthrange(
        month_start.year,
        month_start.month,
    )[1]


def get_budget_status(
    spent: Decimal,
    amount: Decimal,
    warning_percentage: Decimal,
) -> str:
    if amount <= 0:
        return "EXCEEDED"

    percentage_used = (
        spent / amount * Decimal("100")
    )

    if spent > amount:
        return "EXCEEDED"

    if percentage_used >= warning_percentage:
        return "WARNING"

    return "ON_TRACK"


def calculate_projected_spend(
    spent: Decimal,
    month_start: date,
    month_end: date,
    today: date | None = None,
) -> Decimal | None:
    today = today or date.today()

    if month_start > today:
        return None

    days_in_month = get_days_in_month(month_start)

    if month_start.year == today.year and month_start.month == today.month:
        elapsed_days = today.day
    elif today > month_end:
        elapsed_days = days_in_month
    else:
        return None

    if elapsed_days <= 0:
        return None

    projected = (
        spent
        / Decimal(elapsed_days)
        * Decimal(days_in_month)
    )

    return money(projected)


def validate_category(
    db: Session,
    user_id: UUID,
    category_id: UUID | None,
) -> Category | None:
    if category_id is None:
        return None

    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.is_active.is_(True),
        )
        .first()
    )

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found or inactive.",
        )

    if category.category_type != "EXPENSE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Budgets can only be created for expense categories.",
        )

    if (
        not category.is_system
        and category.user_id != user_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Category does not belong to the specified user.",
        )

    return category


def get_budget(
    db: Session,
    user_id: UUID,
    budget_id: UUID,
) -> Budget:
    budget = (
        db.query(Budget)
        .filter(
            Budget.id == budget_id,
            Budget.user_id == user_id,
        )
        .first()
    )

    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found.",
        )

    return budget


def get_budget_insight(
    spent: Decimal,
    amount: Decimal,
    remaining: Decimal,
    projected_overspend: Decimal,
    percentage_used: Decimal,
    days_remaining: int,
    safe_daily_spend: Decimal,
) -> str:
    if projected_overspend > Decimal("0.00"):
        return (
            f"At your current spending rate, this budget may exceed its limit "
            f"by ₹{projected_overspend:,.0f}."
        )

    if remaining <= Decimal("0.00"):
        return "This budget is fully used. Avoid additional discretionary spending."

    if days_remaining <= 0:
        return "The budget period has ended. Review this month's actual spending."

    if percentage_used >= Decimal("80.00"):
        return (
            f"You have {days_remaining} days left. "
            f"Try to keep spending within ₹{safe_daily_spend:,.0f} per day."
        )

    if percentage_used >= Decimal("50.00") and days_remaining <= 10:
        return (
            f"You have {days_remaining} days left with "
            f"₹{remaining:,.0f} remaining."
        )

    return (
        f"You can spend about ₹{safe_daily_spend:,.0f} per day "
        "and stay within this budget."
    )


def get_budget_response(
    db: Session,
    budget: Budget,
) -> dict:
    month_start = budget.month_start
    month_end = get_month_end(month_start)

    spent = get_spending_for_budget(
        db=db,
        user_id=budget.user_id,
        category_id=budget.category_id,
        month_start=month_start,
        month_end=month_end,
    )

    amount = money(budget.amount)

    remaining = money(
        amount - spent
    )

    percentage_used = (
        money(
            spent
            / amount
            * Decimal("100")
        )
        if amount > 0
        else Decimal("100.00")
    )

    projected_spend = calculate_projected_spend(
        spent=spent,
        month_start=month_start,
        month_end=month_end,
    )

    projected_overspend = (
        money(
            max(
                projected_spend - amount,
                Decimal("0.00"),
            )
        )
        if projected_spend is not None
        else Decimal("0.00")
    )

    status_value = get_budget_status(
        spent=spent,
        amount=amount,
        warning_percentage=budget.warning_percentage,
    )

    category_name = None

    if budget.category_id is not None:
        category = (
            db.query(Category)
            .filter(
                Category.id == budget.category_id
            )
            .first()
        )

        if category is not None:
            category_name = category.name

    return {
        "id": budget.id,
        "user_id": budget.user_id,
        "category_id": budget.category_id,
        "category_name": category_name,
        "name": budget.name,
        "month_start": month_start,
        "month_end": month_end,
        "amount": amount,
        "spent": spent,
        "remaining": remaining,
        "percentage_used": percentage_used,
        "warning_percentage": money(
            budget.warning_percentage
        ),
        "projected_spend": projected_spend,
        "projected_overspend": projected_overspend,
        "days_remaining": days_remaining,
        "daily_spend_rate": daily_spend_rate,
        "safe_daily_spend": safe_daily_spend,
        "insight": insight,
        "status": status_value,
        "created_at": budget.created_at.isoformat(),
        "updated_at": budget.updated_at.isoformat(),
    }


def create_budget(
    db: Session,
    user_id: UUID,
    budget_data: BudgetCreate,
) -> dict:
    month_start = normalize_month_start(
        budget_data.month_start
    )

    category = validate_category(
        db=db,
        user_id=user_id,
        category_id=budget_data.category_id,
    )

    existing = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.category_id == budget_data.category_id,
            Budget.month_start == month_start,
        )
        .first()
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A budget already exists for this category and month.",
        )

    budget = Budget(
        user_id=user_id,
        category_id=budget_data.category_id,
        name=budget_data.name.strip(),
        month_start=month_start,
        amount=money(budget_data.amount),
        warning_percentage=money(
            budget_data.warning_percentage
        ),
    )

    if category is not None:
        budget.name = category.name

    db.add(budget)
    db.commit()
    db.refresh(budget)

    return get_budget_response(
        db=db,
        budget=budget,
    )


def list_budgets(
    db: Session,
    user_id: UUID,
    month_start: date | None = None,
) -> tuple[list[dict], int]:
    query = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id
        )
    )

    if month_start is not None:
        normalized_month = normalize_month_start(
            month_start
        )

        query = query.filter(
            Budget.month_start == normalized_month
        )

    budgets = (
        query
        .order_by(
            Budget.month_start.desc(),
            Budget.name.asc(),
        )
        .all()
    )

    items = [
        get_budget_response(
            db=db,
            budget=budget,
        )
        for budget in budgets
    ]

    return items, len(items)


def update_budget(
    db: Session,
    user_id: UUID,
    budget_id: UUID,
    budget_data: BudgetUpdate,
) -> dict:
    budget = get_budget(
        db=db,
        user_id=user_id,
        budget_id=budget_id,
    )

    new_category_id = (
        budget_data.category_id
        if "category_id" in budget_data.model_fields_set
        else budget.category_id
    )

    new_month_start = normalize_month_start(
        budget_data.month_start
        if budget_data.month_start is not None
        else budget.month_start
    )

    validate_category(
        db=db,
        user_id=user_id,
        category_id=new_category_id,
    )

    duplicate = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.category_id == new_category_id,
            Budget.month_start == new_month_start,
            Budget.id != budget.id,
        )
        .first()
    )

    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A budget already exists for this category and month.",
        )

    budget.category_id = new_category_id
    budget.month_start = new_month_start

    if budget_data.name is not None:
        budget.name = budget_data.name.strip()

    if budget_data.amount is not None:
        budget.amount = money(
            budget_data.amount
        )

    if budget_data.warning_percentage is not None:
        budget.warning_percentage = money(
            budget_data.warning_percentage
        )

    db.commit()
    db.refresh(budget)

    return get_budget_response(
        db=db,
        budget=budget,
    )


def delete_budget(
    db: Session,
    user_id: UUID,
    budget_id: UUID,
) -> None:
    budget = get_budget(
        db=db,
        user_id=user_id,
        budget_id=budget_id,
    )

    db.delete(budget)
    db.commit()