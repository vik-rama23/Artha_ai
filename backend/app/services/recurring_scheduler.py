import asyncio
import logging
from datetime import date
from uuid import UUID

from sqlalchemy import text

from app.db.session import SessionLocal
from app.models.budgets import Budget
from app.models.recurring_transactions import RecurringTransaction
from app.models.transactions import Transaction
from app.services.budgets import normalize_month_start
from app.services.notifications import (
    process_notifications_for_user,
)
from app.services.recurring_transactions import (
    process_due_recurring_transactions,
)


logger = logging.getLogger("artha.recurring_scheduler")


# PostgreSQL advisory lock ID used to ensure that only one scheduler
# instance processes recurring transactions and notifications at a time.
RECURRING_SCHEDULER_LOCK_ID = 839274


def acquire_scheduler_lock(db) -> bool:
    result = db.execute(
        text(
            "SELECT pg_try_advisory_lock(:lock_id)"
        ),
        {
            "lock_id": RECURRING_SCHEDULER_LOCK_ID,
        },
    )

    return bool(result.scalar())


def release_scheduler_lock(db) -> None:
    db.execute(
        text(
            "SELECT pg_advisory_unlock(:lock_id)"
        ),
        {
            "lock_id": RECURRING_SCHEDULER_LOCK_ID,
        },
    )


def get_notification_user_ids(
    db,
    processing_date: date,
) -> set[UUID]:
    """
    Find all users who may need notification processing.

    A user is included when they have either:

    1. A budget for the current month, or
    2. An active recurring transaction.

    This is intentionally broader than the due-transaction query because
    notifications may need to be generated before a recurring transaction
    becomes due.

    Example:

        Today: 2026-10-04
        Recurring payment: 2026-10-05

    The recurring scheduler does not consider that transaction due yet,
    but the notification service must still create the "due tomorrow"
    notification.
    """

    month_start = normalize_month_start(
        processing_date
    )

    budget_user_ids = {
        UUID(str(user_id))
        for (user_id,) in (
            db.query(Budget.user_id)
            .filter(
                Budget.month_start == month_start,
            )
            .distinct()
            .all()
        )
    }

    transaction_user_ids = {
        UUID(str(user_id))
        for (user_id,) in (
            db.query(Transaction.user_id)
            .filter(
                Transaction.transaction_date <= processing_date,
            )
            .distinct()
            .all()
        )
    }

    recurring_user_ids = {
        UUID(str(user_id))
        for (user_id,) in (
            db.query(
                RecurringTransaction.user_id
            )
            .filter(
                RecurringTransaction.is_active.is_(True),
            )
            .distinct()
            .all()
        )
    }

    return (
        budget_user_ids
        | recurring_user_ids
        | transaction_user_ids
    )


def get_due_recurring_user_ids(
    db,
    processing_date: date,
) -> list[UUID]:
    """
    Find users who currently have recurring transactions that are due.

    These users are subsequently passed to the existing recurring
    transaction processing service.
    """

    user_ids = (
        db.query(
            RecurringTransaction.user_id
        )
        .filter(
            RecurringTransaction.is_active.is_(True),
            RecurringTransaction.next_occurrence
            <= processing_date,
        )
        .distinct()
        .all()
    )

    return [
        UUID(str(user_id))
        for (user_id,) in user_ids
    ]


async def process_due_recurring_transactions_for_all_users() -> None:
    """
    Execute one complete scheduler cycle.

    Processing order:

        1. Acquire PostgreSQL advisory lock.
        2. Generate notifications.
        3. Generate due recurring transactions.
        4. Release PostgreSQL advisory lock.

    Notifications intentionally run before recurring transaction
    generation. This allows an overdue recurring payment to generate
    its overdue notification before the recurring scheduler catches
    that payment up.
    """

    db = SessionLocal()
    lock_acquired = False

    try:
        # ------------------------------------------------------------
        # ACQUIRE CONCURRENCY LOCK
        # ------------------------------------------------------------

        lock_acquired = acquire_scheduler_lock(db)

        if not lock_acquired:
            logger.info(
                "Recurring scheduler: another scheduler instance "
                "is already processing recurring transactions "
                "and notifications. Skipping this cycle."
            )
            return

        logger.debug(
            "Recurring scheduler: concurrency lock acquired."
        )

        today = date.today()

        # ------------------------------------------------------------
        # NOTIFICATIONS
        # ------------------------------------------------------------

        notification_user_ids = (
            get_notification_user_ids(
                db=db,
                processing_date=today,
            )
        )

        if not notification_user_ids:
            logger.info(
                "Recurring scheduler: no users found "
                "for notification processing."
            )
        else:
            logger.info(
                "Recurring scheduler: found %s user(s) "
                "for notification processing.",
                len(notification_user_ids),
            )

        total_notifications_created = 0
        notification_users_processed = 0
        notification_users_failed = 0

        for user_id in sorted(
            notification_user_ids,
            key=str,
        ):
            try:
                result = (
                    process_notifications_for_user(
                        db=db,
                        user_id=user_id,
                        processing_date=today,
                    )
                )

                notifications_created = result.get(
                    "notifications_created",
                    0,
                )

                total_notifications_created += (
                    notifications_created
                )

                notification_users_processed += 1

                logger.info(
                    "Recurring scheduler: "
                    "notifications processed "
                    "user=%s "
                    "notifications_created=%s",
                    user_id,
                    notifications_created,
                )

            except Exception:
                db.rollback()

                notification_users_failed += 1

                logger.exception(
                    "Recurring scheduler: notification "
                    "processing failed for user=%s",
                    user_id,
                )

        logger.info(
            "Recurring scheduler notification processing "
            "completed: users_processed=%s "
            "users_failed=%s "
            "notifications_created=%s",
            notification_users_processed,
            notification_users_failed,
            total_notifications_created,
        )

        # ------------------------------------------------------------
        # DUE RECURRING TRANSACTIONS
        # ------------------------------------------------------------

        due_user_ids = (
            get_due_recurring_user_ids(
                db=db,
                processing_date=today,
            )
        )

        if not due_user_ids:
            logger.info(
                "Recurring scheduler: no due transactions found."
            )

            return

        logger.info(
            "Recurring scheduler: found %s user(s) with "
            "due recurring transactions.",
            len(due_user_ids),
        )

        total_generated = 0
        total_processed_rules = 0
        total_skipped_rules = 0

        for user_id in due_user_ids:
            try:
                result = (
                    process_due_recurring_transactions(
                        db=db,
                        user_id=UUID(str(user_id)),
                        processing_date=today,
                    )
                )

                generated = result.get(
                    "generated_transactions",
                    0,
                )

                processed_rules = result.get(
                    "processed_rules",
                    0,
                )

                skipped_rules = result.get(
                    "skipped_rules",
                    0,
                )

                total_generated += generated
                total_processed_rules += (
                    processed_rules
                )
                total_skipped_rules += skipped_rules

                logger.info(
                    "Recurring scheduler: user=%s "
                    "processed_rules=%s "
                    "generated_transactions=%s "
                    "skipped_rules=%s",
                    user_id,
                    processed_rules,
                    generated,
                    skipped_rules,
                )

            except Exception:
                db.rollback()

                logger.exception(
                    "Recurring scheduler failed for user=%s",
                    user_id,
                )

        logger.info(
            "Recurring scheduler completed: "
            "processed_rules=%s "
            "generated_transactions=%s "
            "skipped_rules=%s "
            "notifications_created=%s",
            total_processed_rules,
            total_generated,
            total_skipped_rules,
            total_notifications_created,
        )

    except Exception:
        db.rollback()

        logger.exception(
            "Recurring scheduler failed while processing "
            "notifications or recurring transactions."
        )

    finally:
        # ------------------------------------------------------------
        # RELEASE CONCURRENCY LOCK
        # ------------------------------------------------------------

        if lock_acquired:
            try:
                release_scheduler_lock(db)

                logger.debug(
                    "Recurring scheduler: concurrency lock released."
                )

            except Exception:
                logger.exception(
                    "Recurring scheduler: failed to release "
                    "concurrency lock."
                )

        db.close()


async def recurring_scheduler_loop(
    interval_seconds: int,
) -> None:
    """
    Run the scheduler continuously.

    The interval is controlled by:
        settings.recurring_scheduler_interval_seconds
    """

    logger.info(
        "Recurring scheduler started. "
        "Interval: %s seconds.",
        interval_seconds,
    )

    while True:
        try:
            await (
                process_due_recurring_transactions_for_all_users()
            )

        except asyncio.CancelledError:
            logger.info(
                "Recurring scheduler stopped."
            )
            raise

        except Exception:
            logger.exception(
                "Unexpected recurring scheduler error."
            )

        try:
            await asyncio.sleep(
                interval_seconds
            )

        except asyncio.CancelledError:
            logger.info(
                "Recurring scheduler sleep cancelled."
            )
            raise