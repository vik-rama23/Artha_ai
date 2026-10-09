from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AssistantHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)

    model_config = ConfigDict(str_strip_whitespace=True)


class AssistantChatRequest(BaseModel):
    question: str = Field(
        min_length=3,
        max_length=2000,
        description="A question about the user's personal finances.",
    )

    history: list[AssistantHistoryMessage] = Field(
        default_factory=list,
        max_length=12,
        description="Recent messages in the current chat session, oldest first.",
    )

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        if not value:
            raise ValueError("Question cannot be empty.")
        return value


class AssistantChatResponse(BaseModel):
    answer: str
    data_period_start: date
    data_period_end: date
    disclaimer: str
