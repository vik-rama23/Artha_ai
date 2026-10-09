import { apiClient } from "./client";

export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantChatResponse = {
  answer: string;
  data_period_start: string;
  data_period_end: string;
  disclaimer: string;
};

export async function askAssistant(
  question: string,
  history: AssistantHistoryMessage[] = []
): Promise<AssistantChatResponse> {
  return apiClient<AssistantChatResponse>(
    "/api/v1/assistant/chat",
    {
      method: "POST",
      body: JSON.stringify({ question, history: history.slice(-12) }),
    }
  );
}
