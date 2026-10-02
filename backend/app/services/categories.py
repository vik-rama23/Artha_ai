from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.categories import Category
from app.schemas.categories import (
    CategoryCreate,
    CategoryUpdate,
)


def get_categories(
    db: Session,
    user_id: UUID,
    category_type: str | None = None,
    include_inactive: bool = False,
) -> list[Category]:
    statement = select(Category).where(
        (Category.user_id == user_id)
        | (Category.is_system.is_(True))
    )

    if category_type is not None:
        statement = statement.where(
            Category.category_type == category_type
        )

    if not include_inactive:
        statement = statement.where(
            Category.is_active.is_(True)
        )

    statement = statement.order_by(
        Category.is_system.desc(),
        Category.name.asc(),
    )

    return list(
        db.scalars(statement).all()
    )


def get_category(
    db: Session,
    user_id: UUID,
    category_id: UUID,
) -> Category:
    category = db.scalar(
        select(Category)
        .where(
            Category.id == category_id
        )
        .where(
            (Category.user_id == user_id)
            | (Category.is_system.is_(True))
        )
    )

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    return category


def create_category(
    db: Session,
    user_id: UUID,
    payload: CategoryCreate,
) -> Category:
    category_name = payload.name.strip()

    existing_category = db.scalar(
        select(Category)
        .where(
            Category.user_id == user_id
        )
        .where(
            Category.name == category_name
        )
        .where(
            Category.is_active.is_(True)
        )
    )

    if existing_category is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A category with this name "
                "already exists."
            ),
        )

    category = Category(
        user_id=user_id,
        name=category_name,
        category_type=payload.category_type,
        icon=payload.icon,
        is_system=False,
        is_active=True,
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


def update_category(
    db: Session,
    user_id: UUID,
    category_id: UUID,
    payload: CategoryUpdate,
) -> Category:
    category = get_category(
        db=db,
        user_id=user_id,
        category_id=category_id,
    )

    if category.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "System categories cannot "
                "be modified."
            ),
        )

    updates = payload.model_dump(
        exclude_unset=True
    )

    if (
        "name" in updates
        and updates["name"] is not None
    ):
        updates["name"] = (
            updates["name"].strip()
        )

        duplicate = db.scalar(
            select(Category)
            .where(
                Category.user_id == user_id
            )
            .where(
                Category.name
                == updates["name"]
            )
            .where(
                Category.id != category_id
            )
            .where(
                Category.is_active.is_(True)
            )
        )

        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A category with this name "
                    "already exists."
                ),
            )

    for field, value in updates.items():
        setattr(
            category,
            field,
            value,
        )

    db.commit()
    db.refresh(category)

    return category


def delete_category(
    db: Session,
    user_id: UUID,
    category_id: UUID,
) -> None:
    category = get_category(
        db=db,
        user_id=user_id,
        category_id=category_id,
    )

    if category.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "System categories cannot "
                "be deleted."
            ),
        )

    category.is_active = False

    db.commit()