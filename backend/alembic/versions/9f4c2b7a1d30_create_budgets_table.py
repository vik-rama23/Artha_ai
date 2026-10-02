"""create budgets table

Revision ID: 9f4c2b7a1d30
Revises: be2bca081130
Create Date: 2026-10-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "9f4c2b7a1d30"

down_revision: Union[str, Sequence[str], None] = "be2bca081130"

branch_labels: Union[str, Sequence[str], None] = None

depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "budgets",
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
            "category_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "month_start",
            sa.Date(),
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
            "warning_percentage",
            sa.Numeric(
                precision=5,
                scale=2,
            ),
            nullable=False,
            server_default="80.00",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "category_id",
            "month_start",
            name="uq_budgets_user_category_month",
        ),
    )

    op.create_index(
        "ix_budgets_user_id",
        "budgets",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        "ix_budgets_category_id",
        "budgets",
        ["category_id"],
        unique=False,
    )

    op.create_index(
        "ix_budgets_month_start",
        "budgets",
        ["month_start"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_budgets_month_start",
        table_name="budgets",
    )

    op.drop_index(
        "ix_budgets_category_id",
        table_name="budgets",
    )

    op.drop_index(
        "ix_budgets_user_id",
        table_name="budgets",
    )

    op.drop_table("budgets")