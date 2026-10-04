from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.users import User
from app.schemas.notifications import (
    NotificationListResponse,
    NotificationResponse,
)
from app.services.notifications import (
    delete_notification,
    list_notifications,
    mark_all_notifications_read,
    mark_notification_read,
)


router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["Notifications"],
)


@router.get(
    "",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
)
def list_notifications_endpoint(
    is_read: bool | None = Query(
        default=None,
        description="Filter by read state.",
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total, unread_count = list_notifications(
        db=db,
        user_id=current_user.id,
        is_read=is_read,
        limit=limit,
    )

    return {
        "items": items,
        "total": total,
        "unread_count": unread_count,
    }


@router.get(
    "/unread-count",
    status_code=status.HTTP_200_OK,
)
def unread_count_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _, _, unread_count = list_notifications(
        db=db,
        user_id=current_user.id,
        limit=1,
    )

    return {
        "unread_count": unread_count,
    }


@router.patch(
    "/read-all",
    status_code=status.HTTP_200_OK,
)
def mark_all_read_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = mark_all_notifications_read(
        db=db,
        user_id=current_user.id,
    )

    return {
        "updated": updated,
    }


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
)
def mark_read_endpoint(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = mark_notification_read(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    return notification


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_notification_endpoint(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = delete_notification(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    return None
