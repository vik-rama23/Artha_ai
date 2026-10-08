"""add net worth history start date

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-10-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "net_worth_items",
        sa.Column(
            "history_start_date",
            sa.Date(),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE net_worth_items
        SET history_start_date = as_of_date
        WHERE history_start_date IS NULL
        """
    )

    op.alter_column(
        "net_worth_items",
        "history_start_date",
        nullable=False,
    )

    op.create_index(
        "idx_net_worth_items_history_start_date",
        "net_worth_items",
        ["history_start_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "idx_net_worth_items_history_start_date",
        table_name="net_worth_items",
    )
    op.drop_column(
        "net_worth_items",
        "history_start_date",
    )
