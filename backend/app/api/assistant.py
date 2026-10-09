from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.users import User
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
)
from app.services.ai_assistant import ask_financial_question

router = APIRouter(
    prefix="/api/v1/assistant",
    tags=["AI Assistant"],
)


@router.post(
    "/chat",
    response_model=AssistantChatResponse,
    status_code=status.HTTP_200_OK,
)
def chat_with_assistant(
    payload: AssistantChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssistantChatResponse:
    result = ask_financial_question(
        db=db,
        user_id=current_user.id,
        question=payload.question,
        history=[message.model_dump() for message in payload.history],
    )
    return AssistantChatResponse(**result)
