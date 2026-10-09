"use client";

import {
  AlertCircle,
  ArrowUp,
  Bot,
  ChartNoAxesCombined,
  Loader2,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  askAssistant,
  type AssistantChatResponse,
} from "@/lib/api/assistant";

import styles from "./AssistantChat.module.scss";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  dataPeriodStart?: string;
  dataPeriodEnd?: string;
};

const suggestedQuestions = [
  {
    icon: Wallet,
    title: "Understand my spending",
    question:
      "How much did I spend this month, and what are my biggest expense categories?",
  },
  {
    icon: TrendingUp,
    title: "Review my cash flow",
    question:
      "Compare my income, expenses, and net cash flow with the previous month.",
  },
  {
    icon: PiggyBank,
    title: "Find saving opportunities",
    question:
      "Based on my recorded expenses this month, where could I look for ways to save?",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Explain my finances",
    question:
      "Explain what my recorded income, expenses, and net cash flow say about this month.",
  },
];

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createSessionId(): string {
  return typeof window !== "undefined" && window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : createMessageId();
}

function formatPeriodDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function renderAssistantContent(content: string) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let textLines: string[] = [];
  let index = 0;

  const flushText = () => {
    if (textLines.length > 0) {
      nodes.push(
        <p className={styles.assistantTextBlock} key={"text-" + index++}>
          {textLines.join("\n")}
        </p>
      );
      textLines = [];
    }
  };

  const parseCells = (line: string) =>
    line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const dividerPattern = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/;

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes("|") && i + 1 < lines.length && dividerPattern.test(lines[i + 1].trim())) {
      flushText();
      const tableRows = [parseCells(lines[i])];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        tableRows.push(parseCells(lines[i]));
        i += 1;
      }
      i -= 1;
      nodes.push(
        <div className={styles.tableScroll} key={"table-" + index++}>
          <table className={styles.answerTable}>
            <thead>
              <tr>{tableRows[0].map((cell, cellIndex) => <th key={cellIndex}>{cell}</th>)}</tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {tableRows[0].map((_, cellIndex) => <td key={cellIndex}>{row[cellIndex] || "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      textLines.push(lines[i]);
    }
  }
  flushText();

  return <div className={styles.assistantRichContent}>{nodes}</div>;
}

type AssistantChatProps = {
  compact?: boolean;
};

export default function AssistantChat({ compact = false }: AssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem("artha-ai-chat-session-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as {
          sessionId?: string;
          messages?: ChatMessage[];
          disclaimer?: string | null;
        };
        if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
        if (typeof parsed.disclaimer === "string") setDisclaimer(parsed.disclaimer);
        setSessionId(parsed.sessionId || createSessionId());
      } else {
        setSessionId(createSessionId());
      }
    } catch {
      window.sessionStorage.removeItem("artha-ai-chat-session-v1");
    } finally {
      setSessionReady(true);
    }
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    try {
      window.sessionStorage.setItem(
        "artha-ai-chat-session-v1",
        JSON.stringify({ sessionId, messages, disclaimer })
      );
    } catch {
      // Chat remains usable if session storage is unavailable or full.
    }
  }, [messages, disclaimer, sessionId, sessionReady]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  async function submitQuestion(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim();

    if (!trimmedQuestion || isLoading) {
      return;
    }

    setError(null);
    setQuestion("");
    setIsLoading(true);

    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: "user",
        content: trimmedQuestion,
      },
    ]);

    try {
      const response: AssistantChatResponse =
        await askAssistant(
          trimmedQuestion,
          messages.slice(-12).map(({ role, content }) => ({ role, content }))
        );

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: response.answer,
          dataPeriodStart: response.data_period_start,
          dataPeriodEnd: response.data_period_end,
        },
      ]);
      setDisclaimer(response.disclaimer);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Artha AI couldn't answer that just now. Please try again."
      );
      setQuestion(trimmedQuestion);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(question);
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (question.trim() && !isLoading) {
        void submitQuestion(question);
      }
    }
  }

  function handleRetry() {
    const retryQuestion = question.trim();

    if (!retryQuestion || isLoading) {
      return;
    }

    setMessages((current) => {
      const lastMessage = current[current.length - 1];

      if (
        lastMessage?.role === "user" &&
        lastMessage.content === retryQuestion
      ) {
        return current.slice(0, -1);
      }

      return current;
    });

    void submitQuestion(retryQuestion);
  }

  function handleNewChat() {
    if (isLoading) {
      return;
    }

    if (
      (messages.length > 0 || question.trim()) &&
      !window.confirm("Clear this conversation and start a new chat? This cannot be undone.")
    ) {
      return;
    }

    const nextSessionId = createSessionId();
    setSessionId(nextSessionId);
    setMessages([]);
    setError(null);
    setDisclaimer(null);
    setQuestion("");
    try {
      window.sessionStorage.setItem(
        "artha-ai-chat-session-v1",
        JSON.stringify({ sessionId: nextSessionId, messages: [], disclaimer: null })
      );
    } catch {
      // A new chat can still start if session storage is unavailable.
    }
    inputRef.current?.focus();
  }

  const hasMessages = messages.length > 0;

  return (
    <main className={`${styles.page} ${compact ? styles.drawerPage : ""}`}>
      <div className={`${styles.container} ${compact ? styles.drawerContainer : ""}`}>
        <header className={`${styles.header} ${compact ? styles.drawerHeader : ""}`}>
          <div className={styles.headingGroup}>
            <div className={styles.headingIcon}>
              <Sparkles size={23} strokeWidth={1.8} />
            </div>

            <div>
              <p className={styles.eyebrow}>YOUR FINANCIAL COPILOT</p>
              <h1>Artha AI</h1>
              <p className={styles.subtitle}>
                Make sense of your money, one question at a time.
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.newChatButton}
            onClick={handleNewChat}
            disabled={isLoading || (!hasMessages && !question)}
            aria-label="Clear chat history"
            title="Clear chat history for this tab"
          >
            <Trash2 size={15} />
            Clear chat
          </button>
        </header>

        <section className={`${styles.trustStrip} ${compact ? styles.drawerTrustStrip : ""}`} aria-label="AI assistant information">
          <div className={styles.trustItem}>
            <ShieldCheck size={17} />
            <span>Your account data stays behind Artha's secure API</span>
          </div>
          <span className={styles.trustDivider} aria-hidden="true" />
          <div className={styles.trustItem}>
            <ChartNoAxesCombined size={17} />
            <span>Answers use recorded financial data</span>
          </div>
        </section>

        <section className={`${styles.chatCard} ${compact ? styles.drawerChatCard : ""}`} aria-label="Chat with Artha AI">
          {!hasMessages ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeIllustration}>
                <div className={styles.welcomeOrb}>
                  <Sparkles size={30} strokeWidth={1.6} />
                </div>
                <span className={styles.orbDotOne} />
                <span className={styles.orbDotTwo} />
                <span className={styles.orbDotThree} />
              </div>

              <p className={styles.welcomeEyebrow}>LET'S TALK MONEY</p>
              <h2>Your finances, made clearer.</h2>
              <p className={styles.welcomeDescription}>
                Ask about your spending, monthly cash flow, or ways to build
                better money habits. Artha AI will use the financial information
                currently available in your account.
              </p>

              <div className={styles.suggestionsHeading}>
                <span>TRY ASKING</span>
                <span className={styles.suggestionHint}>Choose a question to get started</span>
              </div>

              <div className={styles.suggestions}>
                {suggestedQuestions.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.title}
                      type="button"
                      className={styles.suggestion}
                      onClick={() => void submitQuestion(item.question)}
                      disabled={isLoading}
                    >
                      <span className={styles.suggestionIcon}>
                        <Icon size={18} strokeWidth={1.8} />
                      </span>
                      <span className={styles.suggestionText}>
                        <strong>{item.title}</strong>
                        <span>{item.question}</span>
                      </span>
                      <span className={styles.suggestionArrow} aria-hidden="true">
                        ↗
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`${styles.conversation} ${compact ? styles.drawerConversation : ""}`}>
              <div className={styles.conversationIntro}>
                <span className={styles.conversationBadge}>
                  <Sparkles size={14} />
                  ARTHA AI CONVERSATION
                </span>
                <p>Ask a follow-up whenever you're ready.</p>
              </div>

              <div className={styles.messageList} aria-live="polite">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={
                      message.role === "user"
                        ? styles.userMessageRow
                        : styles.assistantMessageRow
                    }
                  >
                    <div
                      className={
                        message.role === "user"
                          ? styles.userAvatar
                          : styles.assistantAvatar
                      }
                      aria-hidden="true"
                    >
                      {message.role === "user" ? (
                        <span>Y</span>
                      ) : (
                        <Bot size={19} strokeWidth={1.8} />
                      )}
                    </div>

                    <div
                      className={
                        message.role === "user"
                          ? styles.userMessageContent
                          : styles.assistantMessageContent
                      }
                    >
                      <div className={styles.messageAuthor}>
                        {message.role === "user" ? "You" : "Artha AI"}
                      </div>
                      <div
                        className={
                          message.role === "user"
                            ? styles.userBubble
                            : styles.assistantBubble
                        }
                      >
                        {message.role === "assistant" ? renderAssistantContent(message.content) : message.content}
                      </div>

                      {message.role === "assistant" &&
                        message.dataPeriodStart &&
                        message.dataPeriodEnd && (
                          <p className={styles.dataPeriod}>
                            Based on recorded data from{" "}
                            {formatPeriodDate(message.dataPeriodStart)} to{" "}
                            {formatPeriodDate(message.dataPeriodEnd)}.
                          </p>
                        )}
                    </div>
                  </article>
                ))}

                {isLoading && (
                  <article className={styles.assistantMessageRow}>
                    <div className={styles.assistantAvatar} aria-hidden="true">
                      <Bot size={19} strokeWidth={1.8} />
                    </div>
                    <div className={styles.assistantMessageContent}>
                      <div className={styles.messageAuthor}>Artha AI</div>
                      <div className={styles.typingBubble}>
                        <span className={styles.typingDots} aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                        <span>Reviewing your financial data…</span>
                      </div>
                    </div>
                  </article>
                )}

                <div ref={conversationEndRef} />
              </div>
            </div>
          )}

          {error && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={18} />
              <div>
                <strong>Couldn't get an answer</strong>
                <p>{error}</p>
              </div>
              <button
                type="button"
                className={styles.retryButton}
                onClick={handleRetry}
                disabled={!question.trim() || isLoading}
              >
                Retry
              </button>
            </div>
          )}

          <div className={`${styles.composerArea} ${compact ? styles.drawerComposerArea : ""}`}>
            <form className={styles.composer} onSubmit={handleSubmit}>
              <label className={styles.srOnly} htmlFor="assistant-question">
                Ask Artha AI a financial question
              </label>
              <textarea
                id="assistant-question"
                ref={inputRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ask anything about your recorded finances…"
                rows={2}
                maxLength={2000}
                disabled={isLoading}
              />
              <div className={styles.composerFooter}>
                <span className={styles.inputHint}>
                  <span className={styles.enterHint}>↵</span>
                  Enter to send · Shift + Enter for a new line
                </span>
                <span className={styles.characterCount}>
                  {question.length}/2000
                </span>
                <button
                  type="submit"
                  className={styles.sendButton}
                  aria-label="Send question"
                  disabled={!question.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 size={18} className={styles.spinner} />
                  ) : (
                    <ArrowUp size={19} strokeWidth={2.3} />
                  )}
                </button>
              </div>
            </form>

            <p className={styles.disclaimer}>
              {disclaimer ||
                "Artha AI provides informational guidance based on transactions recorded in Artha. It may not reflect every real-world transaction."}
            </p>
          </div>
        </section>

        <footer className={`${styles.pageFooter} ${compact ? styles.drawerFooter : ""}`}>
          <span className={styles.footerSparkle}>
            <Sparkles size={14} />
          </span>
          <span>Thoughtful insights. Better money decisions.</span>
        </footer>
      </div>
    </main>
  );
}
