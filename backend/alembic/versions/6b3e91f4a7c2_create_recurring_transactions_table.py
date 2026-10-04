"""create recurring transactions table

Revision ID: 6b3e91f4a7c2
Revises: 9f4c2b7a1d30
Create Date: 2026-10-04 11:15:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "6b3e91f4a7c2"
down_revision: Union[str, Sequence[str], None] = "9f4c2b7a1d30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recurring_transactions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "category_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "name",
            sa.String(length=150),
            nullable=False,
        ),
        sa.Column(
            "recurring_type",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "transaction_type",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "amount",
            sa.Numeric(
                precision=15,
                scale=2,
            ),
            nullable=False,
        ),
        sa.Column(
            "frequency",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "start_date",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "end_date",
            sa.Date(),
            nullable=True,
        ),
        sa.Column(
            "next_occurrence",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "last_generated_date",
            sa.Date(),
            nullable=True,
        ),
        sa.Column(
            "merchant",
            sa.String(length=150),
            nullable=True,
        ),
        sa.Column(
            "description",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["accounts.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_recurring_transactions_user_id",
        "recurring_transactions",
        ["user_id"],
    )

    op.create_index(
        "ix_recurring_transactions_account_id",
        "recurring_transactions",
        ["account_id"],
    )

    op.create_index(
        "ix_recurring_transactions_category_id",
        "recurring_transactions",
        ["category_id"],
    )

    op.create_index(
        "ix_recurring_transactions_recurring_type",
        "recurring_transactions",
        ["recurring_type"],
    )

    op.create_index(
        "ix_recurring_transactions_next_occurrence",
        "recurring_transactions",
        ["next_occurrence"],
    )

    op.create_index(
        "ix_recurring_transactions_is_active",
        "recurring_transactions",
        ["is_active"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_recurring_transactions_is_active",
        table_name="recurring_transactions",
    )

    op.drop_index(
        "ix_recurring_transactions_next_occurrence",
        table_name="recurring_transactions",
    )

    op.drop_index(
        "ix_recurring_transactions_recurring_type",
        table_name="recurring_transactions",
    )

    op.drop_index(
        "ix_recurring_transactions_category_id",
        table_name="recurring_transactions",
    )

    op.drop_index(
        "ix_recurring_transactions_account_id",
        table_name="recurring_transactions",
    )

    op.drop_index(
        "ix_recurring_transactions_user_id",
        table_name="recurring_transactions",
    )

    op.drop_table("recurring_transactions")