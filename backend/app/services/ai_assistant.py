import json
import logging
from datetime import date, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.financial_context import build_financial_context

logger = logging.getLogger("artha.ai_assistant")

ASSISTANT_INSTRUCTIONS = """
You are Artha, a careful personal-finance assistant for an Indian user.

Use the supplied JSON as the only source of personalized financial figures.
The values are calculated by Artha's backend from the authenticated user's
recorded transactions. Do not invent amounts, dates, categories, balances,
budgets, goals, or account information. Do not claim to have accessed data
that is absent from the context.

The context includes current-month-to-date income, expenses, net cash flow,
the five largest recorded expense categories for this month, and the previous
completed month's aggregate figures. If the question requires data not
included in the context, say so plainly and explain which Artha feature or
data would be needed. Do not attempt SQL, request credentials, or suggest
bypassing application access controls.

Use Indian rupees (₹) and the Indian numbering style when displaying money.
Explain calculations briefly. Distinguish recorded historical figures from
estimates and general guidance. If the user asks for general financial
education, answer generally and clearly separate it from personalized facts.
Do not present yourself as a licensed financial, tax, legal, or investment
advisor. Keep the answer clear, useful, and concise.
"""


def ask_financial_question(
    db: Session,
    user_id: UUID,
    question: str,
    today: date | None = None,
) -> dict:
    snapshot_date = today or date.today()
    current_month_start = snapshot_date.replace(day=1)
    previous_month_end = current_month_start - timedelta(days=1)
    data_period_start = previous_month_end.replace(day=1)

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The AI assistant is not configured yet. "
                "Set OPENAI_API_KEY in the backend .env file and restart the API."
            ),
        )

    try:
        from openai import (
            APIConnectionError,
            APIStatusError,
            AuthenticationError,
            OpenAI,
            OpenAIError,
            RateLimitError,
        )
    except ImportError as exc:
        logger.error("OpenAI SDK is not installed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The OpenAI SDK is missing. Install it in the backend "
                "virtual environment with: pip install openai"
            ),
        ) from exc

    context = build_financial_context(
        db=db,
        user_id=user_id,
        today=snapshot_date,
    )

    try:
        client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout_seconds,
            max_retries=1,
        )
        response = client.responses.create(
            model=settings.openai_model,
            instructions=ASSISTANT_INSTRUCTIONS,
            input=(
                "User question:\n"
                f"{question}\n\n"
                "Verified financial context (JSON):\n"
                f"{json.dumps(context, ensure_ascii=False)}"
            ),
            max_output_tokens=600,
            store=False,
        )
        answer = (response.output_text or "").strip()

        if not answer:
            logger.warning("OpenAI returned an empty assistant response.")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The AI assistant returned an empty response. Please try again.",
            )

    except AuthenticationError as exc:
        logger.error("OpenAI authentication failed. Check OPENAI_API_KEY.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "OpenAI rejected the configured API credential. "
                "Check the backend configuration."
            ),
        ) from exc
    except RateLimitError as exc:
        logger.warning("OpenAI rate limit or quota error.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The AI service is temporarily unavailable or the API quota "
                "has been reached. Check OpenAI API billing and limits, then retry."
            ),
        ) from exc
    except APIConnectionError as exc:
        logger.warning("Could not connect to OpenAI.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach the AI service. Please try again shortly.",
        ) from exc
    except APIStatusError as exc:
        logger.error(
            "OpenAI request failed with status code %s.",
            exc.status_code,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI provider could not complete the request. Please try again.",
        ) from exc
    except OpenAIError as exc:
        logger.error("OpenAI request failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI provider could not complete the request. Please try again.",
        ) from exc

    return {
        "answer": answer,
        "data_period_start": data_period_start,
        "data_period_end": snapshot_date,
        "disclaimer": (
            "Based on transactions recorded in Artha. This is informational "
            "guidance, not professional financial, tax, or investment advice."
        ),
    }
