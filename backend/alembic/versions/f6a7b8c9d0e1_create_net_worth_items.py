"""create net worth items table

Revision ID: f6a7b8c9d0e1
Revises: e1f2a3b4c5d6
Create Date: 2026-10-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "net_worth_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("item_type", sa.String(length=20), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("value", sa.Numeric(15, 2), nullable=False),
        sa.Column("as_of_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
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
        sa.CheckConstraint(
            "item_type IN ('ASSET', 'LIABILITY')",
            name="net_worth_item_type_check",
        ),
        sa.CheckConstraint(
            "value > 0",
            name="net_worth_item_value_positive",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "idx_net_worth_items_user_date",
        "net_worth_items",
        ["user_id", "as_of_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "idx_net_worth_items_user_date",
        table_name="net_worth_items",
    )
    op.drop_table("net_worth_items")
