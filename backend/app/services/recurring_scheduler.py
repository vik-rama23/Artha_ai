import asyncio
import logging
from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.users import User
from app.services.recurring_transactions import (
    process_due_recurring_transactions,
)

logger = logging.getLogger("artha.scheduler")


# PostgreSQL advisory lock ID.
#
# This prevents multiple Artha scheduler instances from processing
# recurring transactions at the same time, including multiple
# Uvicorn workers/processes.
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
    Process all due recurring transactions across active users.

    This function is intentionally synchronous because the underlying
    SQLAlchemy session and recurring transaction service are synchronous.

    The async scheduler loop invokes this function using
    asyncio.to_thread() so database processing does not block the
    scheduler's event loop.

    Returns:
        Dictionary containing processing statistics.
    """

    db = SessionLocal()
    lock_acquired = False

    total_generated = 0
    total_processed_rules = 0
    total_skipped_rules = 0

    try:
        # ---------------------------------------------------------
        # Acquire PostgreSQL scheduler lock
        # ---------------------------------------------------------
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
                "items": [],
                "skipped_due_to_lock": True,
            }

        logger.debug(
            "Recurring scheduler: concurrency lock acquired."
        )

        # ---------------------------------------------------------
        # Find users
        # ---------------------------------------------------------
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
                "items": [],
            }

        logger.info(
            "Recurring scheduler: checking %s user(s).",
            len(user_ids),
        )

        # ---------------------------------------------------------
        # Process recurring transactions for each user
        # ---------------------------------------------------------
        for (user_id,) in user_ids:
            try:
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

        # ---------------------------------------------------------
        # Final summary
        # ---------------------------------------------------------
        logger.info(
            "Recurring scheduler completed: "
            "processed_rules=%s "
            "generated_transactions=%s "
            "skipped_rules=%s",
            total_processed_rules,
            total_generated,
            total_skipped_rules,
        )

        return {
            "processing_date": date.today(),
            "processed_rules": total_processed_rules,
            "generated_transactions": total_generated,
            "skipped_rules": total_skipped_rules,
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
            "items": [],
        }

    finally:
        # ---------------------------------------------------------
        # Release PostgreSQL scheduler lock
        # ---------------------------------------------------------
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
    Continuously process due recurring transactions.

    The scheduler runs once immediately and then repeats according
    to the configured interval.

    The synchronous database processing function is executed in a
    worker thread so it does not block the asyncio event loop.
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
