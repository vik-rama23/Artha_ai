from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.accounts import router as accounts_router
from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.budgets import router as budgets_router
from app.api.categories import router as categories_router
from app.api.dashboard import router as dashboard_router
from app.api.top_transactions import router as top_transactions_router
from app.api.transactions import router as transactions_router


app = FastAPI(
    title="Artha API",
    description="Personal Finance & Expense Management API",
    version="1.0.0",
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
app.include_router(top_transactions_router)
app.include_router(transactions_router)