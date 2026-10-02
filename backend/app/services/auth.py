from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.users import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
)


def get_user_by_email(
    db: Session,
    email: str,
) -> User | None:
    statement = select(User).where(
        User.email == email.lower().strip()
    )

    return db.scalar(statement)


def get_user_by_id(
    db: Session,
    user_id: UUID,
) -> User | None:
    statement = select(User).where(
        User.id == user_id
    )

    return db.scalar(statement)


def register_user(
    db: Session,
    payload: RegisterRequest,
) -> User:
    email = payload.email.lower().strip()

    existing_user = get_user_by_email(
        db=db,
        email=email,
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=email,
        password_hash=hash_password(
            payload.password
        ),
        full_name=(
            payload.full_name.strip()
            if payload.full_name
            else None
        ),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def authenticate_user(
    db: Session,
    payload: LoginRequest,
) -> User:
    email = payload.email.lower().strip()

    user = get_user_by_email(
        db=db,
        email=email,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(
        payload.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return user


def create_user_token(
    user: User,
) -> str:
    return create_access_token(
        subject=str(user.id)
    )