"""create goals and goal contributions tables

Revision ID: e1f2a3b4c5d6
Revises: d8e5f6a7b8c9
Create Date: 2026-10-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "d8e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "goals",
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
            "name",
            sa.String(length=150),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "target_amount",
            sa.Numeric(14, 2),
            nullable=False,
        ),
        sa.Column(
            "current_amount",
            sa.Numeric(14, 2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "target_date",
            sa.Date(),
            nullable=True,
        ),
        sa.Column(
            "icon",
            sa.String(length=100),
            nullable=True,
        ),
        sa.Column(
            "is_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
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
        sa.CheckConstraint(
            "target_amount > 0",
            name="goals_target_positive",
        ),
        sa.CheckConstraint(
            "current_amount >= 0",
            name="goals_current_nonnegative",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "idx_goals_user_id",
        "goals",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "goal_contributions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "goal_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "amount",
            sa.Numeric(14, 2),
            nullable=False,
        ),
        sa.Column(
            "contribution_date",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "amount > 0",
            name="goal_contribution_positive",
        ),
        sa.ForeignKeyConstraint(
            ["goal_id"],
            ["goals.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "idx_goal_contributions_goal_date",
        "goal_contributions",
        ["goal_id", "contribution_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "idx_goal_contributions_goal_date",
        table_name="goal_contributions",
    )

    op.drop_table("goal_contributions")

    op.drop_index(
        "idx_goals_user_id",
        table_name="goals",
    )

    op.drop_table("goals")