import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import { notFound } from "next/navigation";

import { getGoalDetails } from "@/lib/api/goalsServer";

import GoalDetailsClient from "./GoalDetailsClient";

import styles from "./page.module.scss";

type GoalDetailsPageProps = {
  params: Promise<{
    goalId: string;
  }>;
};

function formatCurrency(
  value: string,
): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(amount);
}

function calculateProgress(
  current: string,
  target: string,
): number {
  const currentAmount =
    Number(current);

  const targetAmount =
    Number(target);

  if (
    !Number.isFinite(currentAmount) ||
    !Number.isFinite(targetAmount) ||
    targetAmount <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (currentAmount /
        targetAmount) *
        100,
    ),
  );
}

function getDaysRemaining(
  targetDate: string | null,
): number | null {
  if (!targetDate) {
    return null;
  }

  const target = new Date(
    `${targetDate}T00:00:00`,
  );

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  const difference =
    target.getTime() -
    today.getTime();

  return Math.ceil(
    difference /
      (1000 * 60 * 60 * 24),
  );
}

function formatTargetDate(
  targetDate: string | null,
): string {
  if (!targetDate) {
    return "No target date";
  }

  const date = new Date(
    `${targetDate}T00:00:00`,
  );

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

export default async function GoalDetailsPage({
  params,
}: GoalDetailsPageProps) {
  const { goalId } =
    await params;

  let goal;

  try {
    goal =
      await getGoalDetails(
        goalId,
      );
  } catch {
    notFound();
  }

  const progress =
    calculateProgress(
      goal.current_amount,
      goal.target_amount,
    );

  const currentAmount =
    Number(
      goal.current_amount,
    );

  const targetAmount =
    Number(
      goal.target_amount,
    );

  const remainingAmount =
    Math.max(
      0,
      targetAmount -
        currentAmount,
    );

  const daysRemaining =
    getDaysRemaining(
      goal.target_date,
    );

  const isCompleted =
    goal.is_completed ||
    currentAmount >=
      targetAmount;

  const deadlineStatus =
    isCompleted
      ? "completed"
      : daysRemaining === null
        ? "noDate"
        : daysRemaining < 0
          ? "overdue"
          : daysRemaining <= 30
            ? "dueSoon"
            : "onTrack";

  const deadlineStatusLabel =
    isCompleted
      ? "Goal completed"
      : daysRemaining === null
        ? "No deadline set"
        : daysRemaining < 0
          ? "Overdue"
          : daysRemaining === 0
            ? "Due today"
            : daysRemaining <= 30
              ? "Due soon"
              : "On track";

  return (
    <main className={styles.page}>
      <div
        className={
          styles.container
        }
      >
        {/* ================================================== */}
        {/* BACK */}
        {/* ================================================== */}

        <div
          className={
            styles.backRow
          }
        >
          <Link
            href="/goals"
            className={
              styles.backLink
            }
          >
            <ArrowLeft
              size={17}
            />
            Back to Goals
          </Link>
        </div>

        {/* ================================================== */}
        {/* HERO */}
        {/* ================================================== */}

        <section
          className={
            styles.hero
          }
        >
          <div
            className={
              styles.heroMain
            }
          >
            <div
              className={
                styles.goalIcon
              }
            >
              <Target
                size={24}
                strokeWidth={1.8}
              />
            </div>

            <div
              className={
                styles.heroContent
              }
            >
              <div
                className={
                  styles.titleRow
                }
              >
                <div>
                  <p
                    className={
                      styles.eyebrow
                    }
                  >
                    FINANCIAL GOAL
                  </p>

                  <h1>
                    {goal.name}
                  </h1>
                </div>

                {isCompleted && (
                  <span
                    className={
                      styles.completedBadge
                    }
                  >
                    <CheckCircle2
                      size={14}
                    />
                    Completed
                  </span>
                )}
              </div>

              {goal.description && (
                <p
                  className={
                    styles.description
                  }
                >
                  {goal.description}
                </p>
              )}
            </div>
          </div>

          <div
            className={
              styles.heroActions
            }
          >
            <GoalDetailsClient
              goal={goal}
            />
          </div>
        </section>

        {/* ================================================== */}
        {/* PROGRESS */}
        {/* ================================================== */}

        <section
          className={
            styles.progressCard
          }
        >
          <div
            className={
              styles.progressHeader
            }
          >
            <div>
              <span
                className={
                  styles.progressLabel
                }
              >
                Saved so far
              </span>

              <strong
                className={
                  styles.currentAmount
                }
              >
                {formatCurrency(
                  goal.current_amount,
                )}
              </strong>

              <span
                className={
                  styles.progressSubtext
                }
              >
                {Math.round(progress)}% of your target
              </span>
            </div>

            <div
              className={
                styles.targetAmount
              }
            >
              <span>
                Target
              </span>

              <strong>
                {formatCurrency(
                  goal.target_amount,
                )}
              </strong>
            </div>
          </div>

          <div
            className={
              styles.progressTrack
            }
          >
            <div
              className={
                styles.progressBar
              }
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div
            className={
              styles.progressFooter
            }
          >
            <span>
              {isCompleted
                ? "Target reached"
                : formatCurrency(
                    remainingAmount.toFixed(2),
                  ) + " remaining"}
            </span>

            <span
              className={
                isCompleted
                  ? styles.completedText
                  : styles.progressPercent
              }
            >
              {Math.round(progress)}% complete
            </span>
          </div>
        </section>

        {/* ================================================== */}
        {/* SUMMARY */}
        {/* ================================================== */}

        <section
          className={
            styles.summaryGrid
          }
        >
          <div
            className={
              styles.summaryCard
            }
          >
            <span>
              Target amount
            </span>

            <strong>
              {formatCurrency(
                goal.target_amount,
              )}
            </strong>
          </div>

          <div
            className={
              styles.summaryCard
            }
          >
            <span>
              Current savings
            </span>

            <strong>
              {formatCurrency(
                goal.current_amount,
              )}
            </strong>
          </div>

          <div
            className={
              styles.summaryCard
            }
          >
            <span>
              Remaining
            </span>

            <strong>
              {isCompleted
                ? "₹0"
                : formatCurrency(
                    remainingAmount.toFixed(
                      2,
                    ),
                  )}
            </strong>
          </div>

          <div
            className={
              styles.summaryCard
            }
          >
            <span>
              Target date
            </span>

            <strong>
              {formatTargetDate(
                goal.target_date,
              )}
            </strong>
          </div>
        </section>

        {/* ================================================== */}
        {/* TARGET DATE */}
        {/* ================================================== */}

        <section
          className={`${styles.deadlineCard} ${styles[deadlineStatus]}`}
        >
          <div
            className={
              styles.deadlineIcon
            }
          >
            {daysRemaining !==
              null &&
            daysRemaining <
              0 ? (
              <CircleAlert
                size={19}
              />
            ) : (
              <CalendarDays
                size={19}
              />
            )}
          </div>

          <div className={styles.deadlineContent}>
            <div className={styles.deadlineTitleRow}>
              <strong>
                {goal.target_date
                  ? formatTargetDate(goal.target_date)
                  : "No target date set"}
              </strong>

              <span className={styles.deadlineStatus}>
                {deadlineStatusLabel}
              </span>
            </div>

            <span>
              {isCompleted
                ? "You have reached this financial goal."
                : daysRemaining === null
                  ? "Set a target date to track your deadline."
                  : daysRemaining < 0
                    ? `${Math.abs(daysRemaining)} days past the target date`
                    : daysRemaining === 0
                      ? "Target date is today"
                      : `${daysRemaining} days remaining`}
            </span>
          </div>
        </section>

        {/* ================================================== */}
        {/* CONTRIBUTIONS */}
        {/* ================================================== */}

        <section
          className={
            styles.contributionsCard
          }
        >
          <div
            className={
              styles.contributionsHeader
            }
          >
            <div>
              <p
                className={
                  styles.sectionEyebrow
                }
              >
                PROGRESS HISTORY
              </p>

              <h2>
                Contributions
              </h2>

              <p>
                Track the money you have added towards
                this goal.
              </p>
            </div>

            <span
              className={
                styles.contributionCount
              }
            >
              {goal.contributions.length}{" "}
              {goal.contributions
                .length === 1
                ? "contribution"
                : "contributions"}
            </span>
          </div>

          {goal.contributions.length >
          0 ? (
            <div
              className={
                styles.contributionList
              }
            >
              {goal.contributions.map(
                (contribution) => (
                  <div
                    key={contribution.id}
                    className={styles.contributionRow}
                  >
                    <div className={styles.contributionDate}>
                      <span>
                        {new Intl.DateTimeFormat("en-IN", {
                          day: "2-digit",
                        }).format(
                          new Date(
                            `${contribution.contribution_date}T00:00:00`,
                          ),
                        )}
                      </span>

                      <small>
                        {new Intl.DateTimeFormat("en-IN", {
                          month: "short",
                          year: "numeric",
                        }).format(
                          new Date(
                            `${contribution.contribution_date}T00:00:00`,
                          ),
                        )}
                      </small>
                    </div>

                    <div className={styles.contributionInfo}>
                      <span className={styles.contributionLabel}>
                        Contribution
                      </span>

                      <strong>
                        {formatCurrency(contribution.amount)}
                      </strong>

                      <span className={styles.contributionNote}>
                        {contribution.notes || "Added to this goal"}
                      </span>
                    </div>

                    <div className={styles.contributionAmount}>
                      <TrendingUp size={15} strokeWidth={1.8} />
                      <span>Added</span>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div
              className={
                styles.emptyContributions
              }
            >
              <Target
                size={22}
              />

              <strong>
                No contributions yet
              </strong>

              <span>
                Add your first contribution to start tracking
                progress towards this goal.
              </span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}