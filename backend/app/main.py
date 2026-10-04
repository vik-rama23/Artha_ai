import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.accounts import router as accounts_router
from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.budgets import router as budgets_router
from app.api.categories import router as categories_router
from app.api.dashboard import router as dashboard_router
from app.api.notifications import router as notifications_router
from app.api.recurring_transactions import (
    router as recurring_transactions_router,
)
from app.api.top_transactions import (
    router as top_transactions_router,
)
from app.api.transactions import (
    router as transactions_router,
)
from app.core.config import settings
from app.services.recurring_scheduler import (
    recurring_scheduler_loop,
)

logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | "
        "%(levelname)s | "
        "%(name)s | "
        "%(message)s"
    ),
)

logger = logging.getLogger("artha")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle.

    Starts the recurring transaction scheduler when
    the FastAPI application starts and stops it cleanly
    when the application shuts down.
    """

    scheduler_task: asyncio.Task | None = None

    if settings.recurring_scheduler_enabled:
        scheduler_task = asyncio.create_task(
            recurring_scheduler_loop(
                interval_seconds=(
                    settings.recurring_scheduler_interval_seconds
                )
            )
        )

        logger.info(
            "Recurring transaction scheduler enabled."
        )
    else:
        logger.info(
            "Recurring transaction scheduler disabled."
        )

    try:
        yield

    finally:
        if scheduler_task is not None:
            logger.info(
                "Stopping recurring transaction scheduler."
            )

            scheduler_task.cancel()

            try:
                await scheduler_task
            except asyncio.CancelledError:
                pass

            logger.info(
                "Recurring transaction scheduler stopped."
            )


app = FastAPI(
    title="Artha API",
    description="Personal Finance & Expense Management API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "artha-api",
    }


app.include_router(auth_router)
app.include_router(accounts_router)
app.include_router(analytics_router)
app.include_router(budgets_router)
app.include_router(dashboard_router)
app.include_router(categories_router)
app.include_router(notifications_router)
app.include_router(
    recurring_transactions_router
)
app.include_router(
    top_transactions_router
)
app.include_router(
    transactions_router
)
