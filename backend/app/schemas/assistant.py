from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AssistantChatRequest(BaseModel):
    question: str = Field(
        min_length=3,
        max_length=2000,
        description="A question about the user's personal finances.",
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
