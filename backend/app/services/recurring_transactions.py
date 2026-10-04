from datetime import date
from calendar import monthrange
from decimal import Decimal
from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db import models
from app.models.accounts import Account
from app.models.categories import Category
from app.models.recurring_transactions import (
    RecurringTransaction,

)
from app.models.transactions import Transaction
from app.schemas.recurring_transactions import (
    FREQUENCIES,
    RECURRING_TYPES,
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
)
from app.services.transactions import (
    recalculate_account_balance,
    validate_account,
    validate_category,
)

# ============================================================
# DATE CALCULATION
# ============================================================

def add_months(
    source_date: date,
    months: int,
) -> date:
    """
    Add a number of calendar months while preserving
    the day where possible.
    Example:
        Jan 31 + 1 month -> Feb 28/29
        Mar 31 + 1 month -> Apr 30
    """
    month_index = (
        source_date.year * 12
        + source_date.month
        - 1
        + months
    )
    year = month_index // 12
    month = month_index % 12 + 1
    day = min(
        source_date.day,
        monthrange(year, month)[1],
    )
    return date(
        year=year,
        month=month,
        day=day,
    )

def calculate_next_occurrence(
    current_date: date,
    frequency: str,
) -> date:
    if frequency == "WEEKLY":
        from datetime import timedelta
        return current_date + timedelta(days=7)
    if frequency == "MONTHLY":
        return add_months(
            current_date,
            1,
        )
    if frequency == "QUARTERLY":
        return add_months(
            current_date,
            3,
        )
    if frequency == "YEARLY":
        return add_months(
            current_date,
            12,
        )
    raise ValueError(
        "Unsupported recurring transaction frequency."
    )

# ============================================================
# VALIDATION
# ============================================================

def validate_recurring_type(
    recurring_type: str,
) -> None:
    if recurring_type not in RECURRING_TYPES:
        raise ValueError(
            "Invalid recurring transaction type."
        )

def validate_frequency(
    frequency: str,
) -> None:
    if frequency not in FREQUENCIES:
        raise ValueError(
            "Invalid recurring transaction frequency."
        )

def validate_dates(
    start_date: date,
    next_occurrence: date,
    end_date: date | None,
) -> None:
    if next_occurrence < start_date:
        raise ValueError(
            "Next occurrence cannot be before start date."
        )

    if end_date is not None:
        if end_date < start_date:
            raise ValueError(
                "End date cannot be before start date."
            )
        if next_occurrence > end_date:
            raise ValueError(
                "Next occurrence cannot be after end date."
            )

# ============================================================
# RESPONSE HELPERS
# ============================================================

def get_recurring_transaction(
    db: Session,
    user_id: UUID,
    recurring_transaction_id: UUID,
) -> RecurringTransaction:
    recurring_transaction = (
        db.query(
            RecurringTransaction
        )
        .filter(
            RecurringTransaction.id == recurring_transaction_id,
            RecurringTransaction.user_id == user_id,
        )
        .first()
    )

    if recurring_transaction is None:
        raise ValueError(
            "Recurring transaction not found."
        )
    return recurring_transaction

def get_recurring_transaction_details(
    db: Session,
    user_id: UUID,
    recurring_transaction_id: UUID,
):
    row = (
        db.query(
            RecurringTransaction,
            Account.name.label(
                "account_name"
            ),

            Account.institution_name.label(
                "account_institution_name"
            ),

            Category.name.label(
                "category_name"
            ),
        )
        .join(
            Account,
            Account.id == RecurringTransaction.account_id,
        )
        .outerjoin(
            Category,
            Category.id == RecurringTransaction.category_id,
        )
        .filter(
            RecurringTransaction.id == recurring_transaction_id,
            RecurringTransaction.user_id == user_id,
            Account.user_id == user_id,
        )
        .first()
    )

    if row is None:
        raise ValueError(
            "Recurring transaction not found."
        )
    return row

def get_recurring_transaction_list(
    db: Session,
    user_id: UUID,
    active_only: bool = False,
    recurring_type: str | None = None,
):

    query = (
        db.query(
            RecurringTransaction,
            Account.name.label(
                "account_name"
            ),

            Account.institution_name.label(
                "account_institution_name"
            ),

            Category.name.label(
                "category_name"
            ),
        )
        .join(
            Account,
            Account.id == RecurringTransaction.account_id,
        )
        .outerjoin(
            Category,
            Category.id == RecurringTransaction.category_id,
        )
        .filter(
            RecurringTransaction.user_id == user_id,
            Account.user_id == user_id,
        )
    )

    if active_only:
        query = query.filter(
            RecurringTransaction.is_active.is_(True)
        )

    if recurring_type is not None:
        validate_recurring_type(
            recurring_type
        )

        query = query.filter(
            RecurringTransaction.recurring_type == recurring_type
        )

    total = query.count()
    rows = (
        query
        .order_by(
            RecurringTransaction.is_active.desc(),
            RecurringTransaction.next_occurrence.asc(),
            RecurringTransaction.created_at.desc(),
        )
        .all()
    )
    return rows, total
# ============================================================
# CREATE
# ============================================================

def create_recurring_transaction(
    db: Session,
    user_id: UUID,
    data: RecurringTransactionCreate,
) -> RecurringTransaction:

    # Ensure models are registered in metadata.

    _ = models

    validate_recurring_type(

        data.recurring_type

    )

    validate_frequency(

        data.frequency

    )

    validate_dates(

        start_date=data.start_date,

        next_occurrence=data.next_occurrence,

        end_date=data.end_date,

    )

    # Validate account ownership.

    validate_account(

        db=db,

        user_id=user_id,

        account_id=data.account_id,

    )

    # Validate category ownership/type.

    validate_category(

        db=db,

        user_id=user_id,

        category_id=data.category_id,

        transaction_type=data.transaction_type,

    )

    recurring_transaction = RecurringTransaction(

        user_id=user_id,

        account_id=data.account_id,

        category_id=data.category_id,

        name=data.name,

        recurring_type=data.recurring_type,

        transaction_type=data.transaction_type,

        amount=data.amount,

        frequency=data.frequency,

        start_date=data.start_date,

        end_date=data.end_date,

        next_occurrence=data.next_occurrence,

        merchant=data.merchant,

        description=data.description,

        notes=data.notes,

        is_active=True,

    )

    db.add(recurring_transaction)

    db.commit()

    db.refresh(recurring_transaction)

    return recurring_transaction

# ============================================================

# UPDATE

# ============================================================

def update_recurring_transaction(

    db: Session,

    user_id: UUID,

    recurring_transaction_id: UUID,

    data: RecurringTransactionUpdate,

) -> RecurringTransaction:

    recurring_transaction = (

        get_recurring_transaction(

            db=db,

            user_id=user_id,

            recurring_transaction_id=recurring_transaction_id,

        )

    )

    final_account_id = (

        data.account_id

        if data.account_id is not None

        else recurring_transaction.account_id

    )

    final_category_id = (

        data.category_id

        if data.category_id is not None

        else recurring_transaction.category_id

    )

    final_recurring_type = (

        data.recurring_type

        if data.recurring_type is not None

        else recurring_transaction.recurring_type

    )

    final_frequency = (

        data.frequency

        if data.frequency is not None

        else recurring_transaction.frequency

    )

    final_transaction_type = (

        data.transaction_type

        if data.transaction_type is not None

        else recurring_transaction.transaction_type

    )

    final_start_date = (

        data.start_date

        if data.start_date is not None

        else recurring_transaction.start_date

    )

    final_next_occurrence = (

        data.next_occurrence

        if data.next_occurrence is not None

        else recurring_transaction.next_occurrence

    )

    final_end_date = (

        data.end_date

        if "end_date" in data.model_fields_set

        else recurring_transaction.end_date

    )

    validate_recurring_type(

        final_recurring_type

    )

    validate_frequency(

        final_frequency

    )

    validate_dates(

        start_date=final_start_date,

        next_occurrence=final_next_occurrence,

        end_date=final_end_date,

    )

    validate_account(

        db=db,

        user_id=user_id,

        account_id=final_account_id,

    )

    validate_category(

        db=db,

        user_id=user_id,

        category_id=final_category_id,

        transaction_type=final_transaction_type,

    )

    if "account_id" in data.model_fields_set:

        recurring_transaction.account_id = (

            data.account_id

        )

    if "category_id" in data.model_fields_set:

        recurring_transaction.category_id = (

            data.category_id

        )

    if "name" in data.model_fields_set:

        recurring_transaction.name = (

            data.name

        )

    if "recurring_type" in data.model_fields_set:

        recurring_transaction.recurring_type = (

            data.recurring_type

        )

    if "transaction_type" in data.model_fields_set:

        recurring_transaction.transaction_type = (

            data.transaction_type

        )

    if "amount" in data.model_fields_set:

        recurring_transaction.amount = (

            data.amount

        )

    if "frequency" in data.model_fields_set:

        recurring_transaction.frequency = (

            data.frequency

        )

    if "start_date" in data.model_fields_set:

        recurring_transaction.start_date = (

            data.start_date

        )

    if "end_date" in data.model_fields_set:

        recurring_transaction.end_date = (

            data.end_date

        )

    if "next_occurrence" in data.model_fields_set:

        recurring_transaction.next_occurrence = (

            data.next_occurrence

        )

    if "merchant" in data.model_fields_set:

        recurring_transaction.merchant = (

            data.merchant

        )

    if "description" in data.model_fields_set:

        recurring_transaction.description = (

            data.description

        )

    if "notes" in data.model_fields_set:

        recurring_transaction.notes = (

            data.notes

        )

    if "is_active" in data.model_fields_set:

        recurring_transaction.is_active = (

            data.is_active

        )

    db.commit()

    db.refresh(recurring_transaction)

    return recurring_transaction

# ============================================================

# DELETE

# ============================================================

def delete_recurring_transaction(

    db: Session,

    user_id: UUID,

    recurring_transaction_id: UUID,

) -> None:

    recurring_transaction = (

        get_recurring_transaction(

            db=db,

            user_id=user_id,

            recurring_transaction_id=recurring_transaction_id,

        )

    )

    db.delete(recurring_transaction)

    db.commit()

# ============================================================

# PAUSE

# ============================================================

def pause_recurring_transaction(

    db: Session,

    user_id: UUID,

    recurring_transaction_id: UUID,

) -> RecurringTransaction:

    recurring_transaction = (

        get_recurring_transaction(

            db=db,

            user_id=user_id,

            recurring_transaction_id=recurring_transaction_id,

        )

    )

    recurring_transaction.is_active = False

    db.commit()

    db.refresh(recurring_transaction)

    return recurring_transaction

# ============================================================

# RESUME

# ============================================================

def resume_recurring_transaction(

    db: Session,

    user_id: UUID,

    recurring_transaction_id: UUID,

) -> RecurringTransaction:

    recurring_transaction = (

        get_recurring_transaction(

            db=db,

            user_id=user_id,

            recurring_transaction_id=recurring_transaction_id,

        )

    )

    if (

        recurring_transaction.end_date is not None

        and recurring_transaction.next_occurrence

        > recurring_transaction.end_date

    ):

        raise ValueError(

            "This recurring transaction has already reached its end date."

        )

    recurring_transaction.is_active = True

    db.commit()

    db.refresh(recurring_transaction)

    return recurring_transaction

# ============================================================

# GENERATE TRANSACTION

# ============================================================
def generate_recurring_transaction(
    db: Session,
    user_id: UUID,
    recurring_transaction_id: UUID,
) -> tuple[
    RecurringTransaction,
    Transaction,
]:

    recurring_transaction = (
        get_recurring_transaction(
            db=db,
            user_id=user_id,
            recurring_transaction_id=recurring_transaction_id,
        )
    )

    if not recurring_transaction.is_active:
        raise ValueError(
            "Recurring transaction is paused."
        )

    occurrence_date = (
        recurring_transaction.next_occurrence
    )

    # Generate Now is only allowed when the scheduled
    # occurrence is due today or is already overdue.
    today = date.today()

    if occurrence_date > today:
        raise ValueError(
            f"Recurring transaction is not due yet. "
            f"Next occurrence is {occurrence_date.isoformat()}."
        )

    if (
        recurring_transaction.end_date is not None
        and occurrence_date
        > recurring_transaction.end_date
    ):
        recurring_transaction.is_active = False
        db.commit()

        raise ValueError(
            "Recurring transaction has reached its end date."
        )

    # Prevent duplicate generation of the same occurrence.
    if (
        recurring_transaction.last_generated_date
        == occurrence_date
    ):
        raise ValueError(
            "This scheduled occurrence has already been generated."
        )

    # Validate account and category again at generation time.
    account = validate_account(
        db=db,
        user_id=user_id,
        account_id=recurring_transaction.account_id,
    )

    validate_category(
        db=db,
        user_id=user_id,
        category_id=recurring_transaction.category_id,
        transaction_type=recurring_transaction.transaction_type,
    )

    transaction = Transaction(
        user_id=user_id,
        account_id=recurring_transaction.account_id,
        category_id=recurring_transaction.category_id,
        recurring_transaction_id=recurring_transaction.id,
        transaction_type=recurring_transaction.transaction_type,
        amount=recurring_transaction.amount,
        transaction_date=occurrence_date,
        description=(
            recurring_transaction.description
            or recurring_transaction.name
        ),
        merchant=(
            recurring_transaction.merchant
            or recurring_transaction.name
        ),
        notes=recurring_transaction.notes,
    )

    db.add(transaction)

    # Flush first so the generated transaction is included
    # when recalculating the account balance.
    db.flush()

    # Recalculate account balance using the same
    # source-of-truth logic as normal transactions.
    recalculate_account_balance(
        db=db,
        account_id=account.id,
    )

    recurring_transaction.last_generated_date = (
        occurrence_date
    )

    next_occurrence = calculate_next_occurrence(
        current_date=occurrence_date,
        frequency=recurring_transaction.frequency,
    )

    if (
        recurring_transaction.end_date is not None
        and next_occurrence
        > recurring_transaction.end_date
    ):
        recurring_transaction.next_occurrence = (
            next_occurrence
        )
        recurring_transaction.is_active = False
    else:
        recurring_transaction.next_occurrence = (
            next_occurrence
        )
    db.commit()
    db.refresh(
        recurring_transaction
    )
    db.refresh(transaction)
    return (
        recurring_transaction,
        transaction,
    )
# ============================================================

# PROCESS DUE RECURRING TRANSACTIONS

# ============================================================

def process_due_recurring_transactions(
    db: Session,
    user_id: UUID,
    processing_date: date | None = None,
) -> dict:
    """
    Generate all due recurring transactions for a user.
    A recurring transaction is considered due when:
    next_occurrence <= processing_date
    Future occurrences are never generated.
    If a recurring rule has missed multiple occurrences,
    each missed occurrence is generated in chronological order
    until the next occurrence moves into the future.
    Existing transactions are not migrated or modified.
    """
    today = processing_date or date.today()

    due_rules = (
        db.query(RecurringTransaction)
        .filter(
            RecurringTransaction.user_id == user_id,
            RecurringTransaction.is_active.is_(True),
            RecurringTransaction.next_occurrence <= today,
        )
        .order_by(
            RecurringTransaction.next_occurrence.asc(),
            RecurringTransaction.created_at.asc(),
        )
        .all()

    )

    processed_rules = 0

    generated_transactions = 0

    skipped_rules = 0

    generated_items: list[dict] = []

    for recurring_transaction in due_rules:

        processed_rules += 1

        while (

            recurring_transaction.is_active

            and recurring_transaction.next_occurrence <= today

        ):

            occurrence_date = (

                recurring_transaction.next_occurrence

            )

            if (

                recurring_transaction.end_date is not None

                and occurrence_date

                > recurring_transaction.end_date

            ):

                recurring_transaction.is_active = False

                db.commit()

                db.refresh(recurring_transaction)

                skipped_rules += 1

                break

            try:

                updated_rule, transaction = (

                    generate_recurring_transaction(

                        db=db,

                        user_id=user_id,

                        recurring_transaction_id=(

                            recurring_transaction.id

                        ),

                    )

                )

            except ValueError:

                db.rollback()

                refreshed_rule = (

                    get_recurring_transaction(

                        db=db,

                        user_id=user_id,

                        recurring_transaction_id=(

                            recurring_transaction.id

                        ),

                    )
                )
                recurring_transaction = (
                    refreshed_rule
                )
                # If another process has already generated
                # this occurrence, refresh the rule and continue.
                if (
                    recurring_transaction.last_generated_date == occurrence_date
                ):
                    continue
                # A validation/configuration error should not
                # cause the scheduler to repeatedly retry this
                # rule in the same run.
                skipped_rules += 1
                break
            generated_transactions += 1
            generated_items.append(
                {
                    "recurring_transaction_id": str(
                        updated_rule.id
                    ),
                    "generated_transaction_id": str(
                        transaction.id
                    ),
                    "generated_transaction_date": (
                        transaction.transaction_date
                    ),
                    "generated_amount": (
                        transaction.amount
                    ),
                    "next_occurrence": (
                        updated_rule.next_occurrence
                    ),
                    "is_active": (
                        updated_rule.is_active
                    ),
                }
            )
            recurring_transaction = updated_rule
    return {
        "processing_date": today,
        "processed_rules": processed_rules,
        "generated_transactions": generated_transactions,
        "skipped_rules": skipped_rules,
        "items": generated_items,
    }

