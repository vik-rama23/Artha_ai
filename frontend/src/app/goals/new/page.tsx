"use client";

import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Loader2,
  Shield,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createGoal } from "@/lib/api/goals";
import type { GoalCreatePayload } from "@/types/goal";

import styles from "./new-goal.module.scss";

type GoalIcon =
  | "target"
  | "shield"
  | "trending"
  | "wallet"
  | "calendar";

const goalIcons: {
  value: GoalIcon;
  label: string;
}[] = [
  {
    value: "target",
    label: "General",
  },
  {
    value: "shield",
    label: "Emergency",
  },
  {
    value: "trending",
    label: "Investment",
  },
  {
    value: "wallet",
    label: "Purchase",
  },
  {
    value: "calendar",
    label: "Travel",
  },
];

function getErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Unable to create goal. Please try again.";
}

function getIconComponent(icon: GoalIcon) {
  switch (icon) {
    case "shield":
      return Shield;

    case "trending":
      return TrendingUp;

    case "wallet":
      return Wallet;

    case "calendar":
      return CalendarDays;

    default:
      return Target;
  }
}

export default function NewGoalPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [targetAmount, setTargetAmount] =
    useState("");
  const [currentAmount, setCurrentAmount] =
    useState("0");
  const [targetDate, setTargetDate] =
    useState("");
  const [icon, setIcon] =
    useState<GoalIcon>("target");

  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    const trimmedName =
      name.trim();

    const trimmedDescription =
      description.trim();

    const numericTarget =
      Number(targetAmount);

    const numericCurrent =
      Number(currentAmount || "0");

    if (!trimmedName) {
      setError(
        "Please enter a goal name.",
      );
      return;
    }

    if (
      !Number.isFinite(numericTarget) ||
      numericTarget <= 0
    ) {
      setError(
        "Target amount must be greater than ₹0.",
      );
      return;
    }

    if (
      !Number.isFinite(numericCurrent) ||
      numericCurrent < 0
    ) {
      setError(
        "Current amount cannot be negative.",
      );
      return;
    }

    if (
      numericCurrent >
      numericTarget
    ) {
      setError(
        "Current amount cannot be greater than the target amount.",
      );
      return;
    }

    const payload: GoalCreatePayload = {
      name: trimmedName,
      description:
        trimmedDescription || null,
      target_amount:
        numericTarget.toFixed(2),
      current_amount:
        numericCurrent.toFixed(2),
      target_date:
        targetDate || null,
      icon,
    };

    try {
      setIsSubmitting(true);

      await createGoal(payload);

      router.push("/goals");
      router.refresh();
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* ================================================== */}
        {/* BACK */}
        {/* ================================================== */}

        <div className={styles.backRow}>
          <Link
            href="/goals"
            className={styles.backLink}
          >
            <ArrowLeft size={17} />
            Back to Goals
          </Link>
        </div>

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <header className={styles.header}>
          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              FINANCIAL PLANNING
            </p>

            <h1>Create Goal</h1>

            <p
              className={
                styles.subtitle
              }
            >
              Set a financial target and track your
              progress towards it.
            </p>
          </div>
        </header>

        {/* ================================================== */}
        {/* FORM */}
        {/* ================================================== */}

        <section
          className={
            styles.formCard
          }
        >
          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            {/* ---------------------------------------------- */}
            {/* BASIC DETAILS */}
            {/* ---------------------------------------------- */}

            <div
              className={
                styles.section
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <h2>
                  Goal details
                </h2>

                <p>
                  Give your financial goal a name and
                  decide what you want to achieve.
                </p>
              </div>

              {/* Goal name */}

              <div
                className={
                  styles.field
                }
              >
                <label htmlFor="goal-name">
                  Goal name
                </label>

                <input
                  id="goal-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Emergency Fund"
                  maxLength={150}
                  autoComplete="off"
                />

                <span
                  className={
                    styles.helper
                  }
                >
                  Choose a name that makes your goal
                  easy to recognize.
                </span>
              </div>

              {/* Description */}

              <div
                className={
                  styles.field
                }
              >
                <label htmlFor="goal-description">
                  Description
                  <span
                    className={
                      styles.optional
                    }
                  >
                    Optional
                  </span>
                </label>

                <textarea
                  id="goal-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Build six months of essential expenses."
                  rows={4}
                  maxLength={1000}
                />

                <span
                  className={
                    styles.helper
                  }
                >
                  Add some context about why this goal
                  matters to you.
                </span>
              </div>
            </div>

            {/* ---------------------------------------------- */}
            {/* AMOUNT */}
            {/* ---------------------------------------------- */}

            <div
              className={
                styles.section
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <h2>
                  Goal amount
                </h2>

                <p>
                  Set your target and, if you have already
                  saved something, enter the current amount.
                </p>
              </div>

              <div
                className={
                  styles.twoColumn
                }
              >
                {/* Target */}

                <div
                  className={
                    styles.field
                  }
                >
                  <label htmlFor="target-amount">
                    Target amount
                  </label>

                  <div
                    className={
                      styles.amountInput
                    }
                  >
                    <span>₹</span>

                    <input
                      id="target-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        targetAmount
                      }
                      onChange={(
                        event,
                      ) =>
                        setTargetAmount(
                          event.target
                            .value,
                        )
                      }
                      placeholder="3,00,000"
                      inputMode="decimal"
                    />
                  </div>

                  <span
                    className={
                      styles.helper
                    }
                  >
                    The total amount you want to reach.
                  </span>
                </div>

                {/* Current */}

                <div
                  className={
                    styles.field
                  }
                >
                  <label htmlFor="current-amount">
                    Current amount
                  </label>

                  <div
                    className={
                      styles.amountInput
                    }
                  >
                    <span>₹</span>

                    <input
                      id="current-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        currentAmount
                      }
                      onChange={(
                        event,
                      ) =>
                        setCurrentAmount(
                          event.target
                            .value,
                        )
                      }
                      placeholder="0"
                      inputMode="decimal"
                    />
                  </div>

                  <span
                    className={
                      styles.helper
                    }
                  >
                    How much you have already saved.
                  </span>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------- */}
            {/* TARGET DATE */}
            {/* ---------------------------------------------- */}

            <div
              className={
                styles.section
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <h2>
                  Target date
                </h2>

                <p>
                  Choose when you would like to reach this
                  goal.
                </p>
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label htmlFor="target-date">
                  Target date
                  <span
                    className={
                      styles.optional
                    }
                  >
                    Optional
                  </span>
                </label>

                <div
                  className={
                    styles.dateInput
                  }
                >
                  <CalendarDays
                    size={17}
                    strokeWidth={1.8}
                  />

                  <input
                    id="target-date"
                    type="date"
                    value={
                      targetDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setTargetDate(
                        event.target
                          .value,
                      )
                    }
                  />
                </div>

                <span
                  className={
                    styles.helper
                  }
                >
                  A target date helps Artha show how much time
                  you have left.
                </span>
              </div>
            </div>

            {/* ---------------------------------------------- */}
            {/* ICON */}
            {/* ---------------------------------------------- */}

            <div
              className={
                styles.section
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <h2>
                  Goal icon
                </h2>

                <p>
                  Choose an icon that represents your goal.
                </p>
              </div>

              <div
                className={
                  styles.iconOptions
                }
              >
                {goalIcons.map(
                  (option) => {
                    const Icon =
                      getIconComponent(
                        option.value,
                      );

                    const selected =
                      icon ===
                      option.value;

                    return (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        className={`${styles.iconOption} ${
                          selected
                            ? styles.iconOptionActive
                            : ""
                        }`}
                        onClick={() =>
                          setIcon(
                            option.value,
                          )
                        }
                        aria-pressed={
                          selected
                        }
                      >
                        <span
                          className={
                            styles.iconOptionIcon
                          }
                        >
                          <Icon
                            size={20}
                            strokeWidth={
                              1.8
                            }
                          />
                        </span>

                        <span
                          className={
                            styles.iconOptionLabel
                          }
                        >
                          {
                            option.label
                          }
                        </span>

                        {selected && (
                          <span
                            className={
                              styles.selectedIcon
                            }
                          >
                            <Check
                              size={11}
                              strokeWidth={
                                2.5
                              }
                            />
                          </span>
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* ---------------------------------------------- */}
            {/* ERROR */}
            {/* ---------------------------------------------- */}

            {error && (
              <div
                className={styles.error}
                role="alert"
              >
                <strong>
                  Unable to create goal
                </strong>

                <span>
                  {error}
                </span>
              </div>
            )}

            {/* ---------------------------------------------- */}
            {/* ACTIONS */}
            {/* ---------------------------------------------- */}

            <div
              className={
                styles.actions
              }
            >
              <Link
                href="/goals"
                className={
                  styles.cancelButton
                }
              >
                Cancel
              </Link>

              <button
                type="submit"
                className={
                  styles.submitButton
                }
                disabled={
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      size={17}
                      className={
                        styles.spinner
                      }
                    />

                    Creating...
                  </>
                ) : (
                  <>
                    <Target
                      size={17}
                      strokeWidth={1.9}
                    />

                    Create Goal
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}