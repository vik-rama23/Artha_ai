import json
import logging
from datetime import date, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.financial_context import build_financial_context
from app.services.financial_tools import (
    FINANCIAL_TOOLS,
    execute_financial_tool,
)

logger = logging.getLogger("artha.ai_assistant")

ASSISTANT_INSTRUCTIONS = """
You are Artha, a careful personal-finance assistant for an Indian user.

Use the supplied JSON as the only source of personalized financial figures.
The values are calculated by Artha's backend from the authenticated user's
recorded transactions. Do not invent amounts, dates, categories, balances,
budgets, goals, or account information. Do not claim to have accessed data
that is absent from the context.

The baseline context includes current-month-to-date income, expenses,
net cash flow, the five largest recorded expense categories, previous completed
month aggregates, and current-month budgets. You also have read-only tools for
the authenticated user's accounts and calculated balances, transaction search,
budgets by month, financial goals, net worth and its asset/liability breakdown,
and recurring transactions.

Use the relevant tools when a question requires those details. For bank/account
questions, call get_accounts. For transaction or spending-history questions,
call search_transactions with suitable date/type/search filters. For budget
questions, call get_budgets for the relevant month. For goals, net worth, and
recurring payments, use their corresponding tools. You may call more than one
tool when needed to answer a comparison or calculation. Never claim to have
retrieved data unless a tool result or the baseline context contains it.
Tool results are read-only and scoped by the backend to the authenticated user.

For questions about a category budget (for example, groceries), inspect
current_month_budgets first and match the requested category/name case-insensitively.
If a matching budget exists, answer using its supplied figures. Do not suggest
a different budget amount or percentage-of-income budget unless the user
explicitly asks for a new budget recommendation. If the budget exists but has
zero recorded spending, say that Artha currently records ₹0 for that budget
period; do not claim the user has spent nothing outside Artha. If no matching
budget exists, say that no matching budget is configured for the current month
and then offer general options only if useful. Do not treat the top expense
categories as a list of existing budgets.

If the question requires data not included in the context, say so plainly and
explain which Artha feature or data would be needed. Do not attempt SQL, request
credentials, or suggest bypassing application access controls.

When presenting comparisons, account lists, category breakdowns, budgets, goals, recurring payments, or several numeric values, prefer concise Markdown tables with clear column headers. Keep simple answers in prose and follow tables with a short takeaway when useful. Use Indian rupees (₹) and the Indian numbering style when displaying money.
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
    history: list[dict[str, str]] | None = None,
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
        with OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout_seconds,
            max_retries=1,
        ) as client:
            response = client.responses.create(
                model=settings.openai_model,
                instructions=ASSISTANT_INSTRUCTIONS,
                input=[
                    *[
                        {
                            "role": item["role"],
                            "content": item["content"][:4000],
                        }
                        for item in (history or [])[-12:]
                        if item.get("role") in {"user", "assistant"}
                        and isinstance(item.get("content"), str)
                    ],
                    {
                        "role": "user",
                        "content": (
                            "User question:\\n"
                            f"{question}\\n\\n"
                            "Verified baseline financial context (JSON):\\n"
                            f"{json.dumps(context, ensure_ascii=False)}"
                        ),
                    },
                ],
                tools=FINANCIAL_TOOLS,
                tool_choice="auto",
                reasoning={"effort": "low"},
                max_output_tokens=1800,
                store=False,
            )

            # Allow a bounded number of read-only tool rounds. Every tool
            # receives the authenticated user_id from the API dependency;
            # the model cannot provide or override a user ID.
            for _ in range(4):
                tool_calls = [
                    item for item in response.output
                    if getattr(item, "type", None) == "function_call"
                ]
                if not tool_calls:
                    break

                tool_outputs = []
                for tool_call in tool_calls:
                    tool_result = execute_financial_tool(
                        db=db,
                        user_id=user_id,
                        tool_name=tool_call.name,
                        arguments_json=tool_call.arguments,
                    )
                    tool_outputs.append({
                        "type": "function_call_output",
                        "call_id": tool_call.call_id,
                        "output": tool_result,
                    })

                response = client.responses.create(
                    model=settings.openai_model,
                    instructions=ASSISTANT_INSTRUCTIONS,
                    input=list(response.output) + tool_outputs,
                    tools=FINANCIAL_TOOLS,
                    tool_choice="auto",
                    reasoning={"effort": "low"},
                    max_output_tokens=1800,
                    store=False,
                )
        answer = (response.output_text or "").strip()

        # Log response metadata without logging the user's financial context.
        logger.info(
            "OpenAI response status=%s, incomplete_reason=%s, output_types=%s",
            response.status,
            (
                response.incomplete_details.reason
                if response.incomplete_details
                else None
            ),
            [item.type for item in response.output],
        )

        answer = (response.output_text or "").strip()

        if not answer:
            logger.warning("OpenAI returned no user-visible text.")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "The AI provider returned no text. "
                    "Please retry. Check backend logs for response status."
                ),
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
