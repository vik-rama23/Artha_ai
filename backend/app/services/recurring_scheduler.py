import asyncio
import logging
from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.users import User
from app.services.notifications import (
    process_notifications_for_user,
)
from app.services.recurring_transactions import (
    process_due_recurring_transactions,
)

logger = logging.getLogger("artha.scheduler")


# PostgreSQL advisory lock ID.
#
# This prevents multiple Artha scheduler instances from processing
# recurring transactions and notification events at the same time,
# including multiple Uvicorn workers/processes.
RECURRING_SCHEDULER_LOCK_ID = 839274


def acquire_scheduler_lock(db: Session) -> bool:
    """
    Attempt to acquire the PostgreSQL advisory lock.

    PostgreSQL keeps this lock for the lifetime of the database
    connection/session holding it.

    Returns:
        True if the lock was acquired.
        False if another scheduler instance already holds it.
    """

    result = db.execute(
        text(
            "SELECT pg_try_advisory_lock(:lock_id)"
        ),
        {
            "lock_id": RECURRING_SCHEDULER_LOCK_ID,
        },
    )

    return bool(result.scalar())


def release_scheduler_lock(db: Session) -> None:
    """
    Release the PostgreSQL advisory lock.
    """

    db.execute(
        text(
            "SELECT pg_advisory_unlock(:lock_id)"
        ),
        {
            "lock_id": RECURRING_SCHEDULER_LOCK_ID,
        },
    )


def process_due_recurring_transactions_for_all_users() -> dict:
    """
    Process recurring transactions and in-app notifications for all users.

    Notifications are evaluated before due recurring transactions are
    generated so overdue rules can produce an overdue notification before
    a scheduler catch-up advances their next occurrence.
    """

    db = SessionLocal()
    lock_acquired = False

    total_generated = 0
    total_processed_rules = 0
    total_skipped_rules = 0
    total_notifications_created = 0

    try:
        lock_acquired = acquire_scheduler_lock(db)

        if not lock_acquired:
            logger.info(
                "Recurring scheduler skipped: another scheduler "
                "instance is already processing."
            )

            return {
                "processing_date": date.today(),
                "processed_rules": 0,
                "generated_transactions": 0,
                "skipped_rules": 0,
                "notifications_created": 0,
                "items": [],
                "skipped_due_to_lock": True,
            }

        logger.debug(
            "Recurring scheduler: concurrency lock acquired."
        )

        user_ids = db.query(User.id).all()

        if not user_ids:
            logger.info(
                "Recurring scheduler: no users found."
            )

            return {
                "processing_date": date.today(),
                "processed_rules": 0,
                "generated_transactions": 0,
                "skipped_rules": 0,
                "notifications_created": 0,
                "items": [],
            }

        logger.info(
            "Recurring scheduler: checking %s user(s).",
            len(user_ids),
        )

        for (user_id,) in user_ids:
            try:
                notification_result = process_notifications_for_user(
                    db=db,
                    user_id=user_id,
                )

                notifications_created = notification_result.get(
                    "notifications_created",
                    0,
                )

                total_notifications_created += (
                    notifications_created
                )

                result = process_due_recurring_transactions(
                    db,
                    user_id,
                )

                processed_rules = result.get(
                    "processed_rules",
                    0,
                )

                generated = result.get(
                    "generated_transactions",
                    0,
                )

                skipped_rules = result.get(
                    "skipped_rules",
                    0,
                )

                total_generated += generated
                total_processed_rules += processed_rules
                total_skipped_rules += skipped_rules

                logger.info(
                    "Recurring scheduler: user=%s "
                    "notifications_created=%s "
                    "processed_rules=%s "
                    "generated_transactions=%s "
                    "skipped_rules=%s",
                    user_id,
                    notifications_created,
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
            "notifications_created=%s "
            "processed_rules=%s "
            "generated_transactions=%s "
            "skipped_rules=%s",
            total_notifications_created,
            total_processed_rules,
            total_generated,
            total_skipped_rules,
        )

        return {
            "processing_date": date.today(),
            "processed_rules": total_processed_rules,
            "generated_transactions": total_generated,
            "skipped_rules": total_skipped_rules,
            "notifications_created": total_notifications_created,
            "items": [],
        }

    except Exception:
        db.rollback()

        logger.exception(
            "Recurring scheduler failed while discovering "
            "or processing users."
        )

        return {
            "processing_date": date.today(),
            "processed_rules": total_processed_rules,
            "generated_transactions": total_generated,
            "skipped_rules": total_skipped_rules,
            "notifications_created": total_notifications_created,
            "items": [],
        }

    finally:
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
    Continuously process due recurring transactions and notifications.

    The scheduler runs once immediately and then repeats according
    to the configured interval.
    """

    logger.info(
        "Recurring scheduler started. "
        "Interval: %s seconds.",
        interval_seconds,
    )

    while True:
        try:
            result = await asyncio.to_thread(
                process_due_recurring_transactions_for_all_users
            )

            logger.debug(
                "Recurring scheduler cycle result: %s",
                result,
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
