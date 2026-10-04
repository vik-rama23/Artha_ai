from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.budgets import Budget
from app.models.notifications import Notification
from app.models.recurring_transactions import RecurringTransaction
from app.services.budgets import (
    get_budget_status,
    get_month_end,
    get_spending_for_budget,
    normalize_month_start,
)


BUDGET_WARNING = "BUDGET_WARNING"
BUDGET_EXCEEDED = "BUDGET_EXCEEDED"
RECURRING_PAYMENT_DUE = "RECURRING_PAYMENT_DUE"
RECURRING_PAYMENT_OVERDUE = "RECURRING_PAYMENT_OVERDUE"

PRIORITY_LOW = "LOW"
PRIORITY_MEDIUM = "MEDIUM"
PRIORITY_HIGH = "HIGH"


def _utc_datetime_for_date(value: date) -> datetime:
    return datetime.combine(
        value,
        time.min,
        tzinfo=timezone.utc,
    )


def _format_amount(value: Decimal) -> str:
    return f"{Decimal(value):,.2f}"


def create_notification(
    db: Session,
    *,
    user_id: UUID,
    notification_type: str,
    title: str,
    message: str,
    priority: str,
    dedupe_key: str,
    reference_type: str | None = None,
    reference_id: UUID | None = None,
    scheduled_for: datetime | None = None,
) -> Notification | None:
    """
    Insert a notification exactly once.

    The dedupe_key is enforced by PostgreSQL. This avoids race conditions
    when more than one scheduler process attempts to create the same event.
    """

    statement = (
        insert(Notification)
        .values(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            priority=priority,
            is_read=False,
            reference_type=reference_type,
            reference_id=reference_id,
            scheduled_for=scheduled_for,
            dedupe_key=dedupe_key,
        )
        .on_conflict_do_nothing(
            index_elements=["dedupe_key"],
        )
    )

    result = db.execute(statement)

    if result.rowcount == 1:
        db.flush()

        return (
            db.query(Notification)
            .filter(
                Notification.dedupe_key == dedupe_key,
            )
            .first()
        )

    return None


def list_notifications(
    db: Session,
    user_id: UUID,
    *,
    is_read: bool | None = None,
    limit: int = 50,
) -> tuple[list[Notification], int, int]:
    query = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
    )

    if is_read is not None:
        query = query.filter(
            Notification.is_read.is_(is_read)
        )

    total = query.count()

    items = (
        query
        .order_by(
            Notification.created_at.desc(),
        )
        .limit(limit)
        .all()
    )

    unread_count = (
        db.query(func.count(Notification.id))
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .scalar()
        or 0
    )

    return items, total, int(unread_count)


def get_notification(
    db: Session,
    user_id: UUID,
    notification_id: UUID,
) -> Notification | None:
    return (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )


def mark_notification_read(
    db: Session,
    user_id: UUID,
    notification_id: UUID,
) -> Notification | None:
    notification = get_notification(
        db=db,
        user_id=user_id,
        notification_id=notification_id,
    )

    if notification is None:
        return None

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)

    return notification


def mark_all_notifications_read(
    db: Session,
    user_id: UUID,
) -> int:
    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .all()
    )

    now = datetime.now(timezone.utc)

    for notification in notifications:
        notification.is_read = True
        notification.read_at = now

    if notifications:
        db.commit()

    return len(notifications)


def delete_notification(
    db: Session,
    user_id: UUID,
    notification_id: UUID,
) -> bool:
    notification = get_notification(
        db=db,
        user_id=user_id,
        notification_id=notification_id,
    )

    if notification is None:
        return False

    db.delete(notification)
    db.commit()

    return True


def _create_budget_notification(
    db: Session,
    *,
    user_id: UUID,
    budget: Budget,
    processing_date: date,
) -> bool:
    month_start = normalize_month_start(
        budget.month_start
    )
    month_end = get_month_end(month_start)

    spent = get_spending_for_budget(
        db=db,
        user_id=user_id,
        category_id=budget.category_id,
        month_start=month_start,
        month_end=month_end,
    )

    amount = Decimal(budget.amount)

    status_value = get_budget_status(
        spent=spent,
        amount=amount,
        warning_percentage=Decimal(
            budget.warning_percentage
        ),
    )

    budget_label = budget.name.strip()

    if status_value == "EXCEEDED":
        notification_type = BUDGET_EXCEEDED
        title = f"Budget exceeded: {budget_label}"
        message = (
            f"{budget_label} has exceeded its "
            f"{_format_amount(amount)} budget. "
            f"Current spending is "
            f"{_format_amount(spent)}."
        )
        priority = PRIORITY_HIGH
        dedupe_key = (
            f"{BUDGET_EXCEEDED}:"
            f"{budget.id}:"
            f"{month_start.isoformat()}"
        )
    elif status_value == "WARNING":
        percentage_used = (
            spent / amount * Decimal("100")
            if amount > 0
            else Decimal("100")
        )
        notification_type = BUDGET_WARNING
        title = f"Budget warning: {budget_label}"
        message = (
            f"You have used "
            f"{percentage_used.quantize(Decimal('0.1'))}% "
            f"of your {_format_amount(amount)} "
            f"{budget_label} budget. "
            f"Current spending is "
            f"{_format_amount(spent)}."
        )
        priority = PRIORITY_MEDIUM
        dedupe_key = (
            f"{BUDGET_WARNING}:"
            f"{budget.id}:"
            f"{month_start.isoformat()}"
        )
    else:
        return False

    notification = create_notification(
        db=db,
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        priority=priority,
        dedupe_key=dedupe_key,
        reference_type="BUDGET",
        reference_id=budget.id,
        scheduled_for=_utc_datetime_for_date(
            processing_date
        ),
    )

    return notification is not None


def _create_recurring_due_notification(
    db: Session,
    *,
    user_id: UUID,
    recurring_transaction: RecurringTransaction,
    occurrence_date: date,
) -> bool:
    notification = create_notification(
        db=db,
        user_id=user_id,
        notification_type=RECURRING_PAYMENT_DUE,
        title=(
            f"Payment due tomorrow: "
            f"{recurring_transaction.name}"
        ),
        message=(
            f"{_format_amount(recurring_transaction.amount)} "
            f"is scheduled for "
            f"{occurrence_date.isoformat()}."
        ),
        priority=PRIORITY_MEDIUM,
        dedupe_key=(
            f"{RECURRING_PAYMENT_DUE}:"
            f"{recurring_transaction.id}:"
            f"{occurrence_date.isoformat()}"
        ),
        reference_type="RECURRING_TRANSACTION",
        reference_id=recurring_transaction.id,
        scheduled_for=_utc_datetime_for_date(
            occurrence_date
        ),
    )

    return notification is not None


def _create_recurring_overdue_notification(
    db: Session,
    *,
    user_id: UUID,
    recurring_transaction: RecurringTransaction,
    occurrence_date: date,
) -> bool:
    notification = create_notification(
        db=db,
        user_id=user_id,
        notification_type=RECURRING_PAYMENT_OVERDUE,
        title=(
            f"Payment overdue: "
            f"{recurring_transaction.name}"
        ),
        message=(
            f"{_format_amount(recurring_transaction.amount)} "
            f"was scheduled for "
            f"{occurrence_date.isoformat()} and is still pending."
        ),
        priority=PRIORITY_HIGH,
        dedupe_key=(
            f"{RECURRING_PAYMENT_OVERDUE}:"
            f"{recurring_transaction.id}:"
            f"{occurrence_date.isoformat()}"
        ),
        reference_type="RECURRING_TRANSACTION",
        reference_id=recurring_transaction.id,
        scheduled_for=_utc_datetime_for_date(
            occurrence_date
        ),
    )

    return notification is not None


def process_notifications_for_user(
    db: Session,
    user_id: UUID,
    processing_date: date | None = None,
) -> dict:
    """
    Generate deterministic in-app notifications for one user.

    Notifications are generated before recurring transactions are processed
    by the scheduler. This means a missed recurring occurrence can produce
    an overdue alert before the scheduler catches it up.

    Database-level dedupe keys make this safe to run repeatedly.
    """

    today = processing_date or date.today()
    created = 0

    try:
        month_start = normalize_month_start(today)
        budgets = (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.month_start == month_start,
            )
            .order_by(Budget.created_at.asc())
            .all()
        )

        for budget in budgets:
            if _create_budget_notification(
                db=db,
                user_id=user_id,
                budget=budget,
                processing_date=today,
            ):
                created += 1

        tomorrow = today + timedelta(days=1)

        due_rules = (
            db.query(RecurringTransaction)
            .filter(
                RecurringTransaction.user_id == user_id,
                RecurringTransaction.is_active.is_(True),
                RecurringTransaction.next_occurrence == tomorrow,
            )
            .all()
        )

        for recurring_transaction in due_rules:
            if _create_recurring_due_notification(
                db=db,
                user_id=user_id,
                recurring_transaction=recurring_transaction,
                occurrence_date=tomorrow,
            ):
                created += 1

        overdue_rules = (
            db.query(RecurringTransaction)
            .filter(
                RecurringTransaction.user_id == user_id,
                RecurringTransaction.is_active.is_(True),
                RecurringTransaction.next_occurrence < today,
            )
            .all()
        )

        for recurring_transaction in overdue_rules:
            if _create_recurring_overdue_notification(
                db=db,
                user_id=user_id,
                recurring_transaction=recurring_transaction,
                occurrence_date=(
                    recurring_transaction.next_occurrence
                ),
            ):
                created += 1

        db.commit()

        return {
            "processing_date": today,
            "notifications_created": created,
        }

    except Exception:
        db.rollback()
        raise
