from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine
from sqlalchemy import pool

from app.core.config import settings
from app.db.base import Base

from app.models.users import User
from app.models.accounts import Account
from app.models.categories import Category
from app.models.transactions import Transaction
from app.models.budgets import Budget
from app.models.recurring_transactions import RecurringTransaction
from app.models.notifications import Notification
from app.models.goals import Goal, GoalContribution\nfrom app.models.net_worth import NetWorthItem


# Alembic Config object
config = context.config


# Configure Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# SQLAlchemy metadata
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in offline mode.

    Generates SQL without creating a database connection.
    """

    url = settings.database_url

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named",
        },
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in online mode.

    Creates a SQLAlchemy connection to PostgreSQL
    using the DATABASE_URL from our .env file.
    """

    connectable = create_engine(
        settings.database_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()