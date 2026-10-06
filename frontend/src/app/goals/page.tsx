import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  getGoals,
} from "@/lib/api/goalsServer";
import type { Goal } from "@/types/goal";

import styles from "./page.module.scss";

function formatCurrency(value: string | number): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getProgressPercentage(goal: Goal): number {
  const target = Number(goal.target_amount);
  const current = Number(goal.current_amount);

  if (!Number.isFinite(target) || target <= 0) {
    return 0;
  }

  if (!Number.isFinite(current) || current <= 0) {
    return 0;
  }

  return Math.min(
    Math.max((current / target) * 100, 0),
    100,
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

  if (Number.isNaN(date.getTime())) {
    return "No target date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getRemainingAmount(goal: Goal): number {
  const target = Number(goal.target_amount);
  const current = Number(goal.current_amount);

  if (
    !Number.isFinite(target) ||
    !Number.isFinite(current)
  ) {
    return 0;
  }

  return Math.max(target - current, 0);
}

function getDaysRemaining(
  targetDate: string | null,
): number | null {
  if (!targetDate) {
    return null;
  }

  const today = new Date();
  const target = new Date(
    `${targetDate}T00:00:00`,
  );

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const difference =
    target.getTime() - today.getTime();

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24),
  );
}

function getDateLabel(
  targetDate: string | null,
): string {
  const days = getDaysRemaining(targetDate);

  if (days === null) {
    return "No deadline";
  }

  if (days < 0) {
    return "Target date passed";
  }

  if (days === 0) {
    return "Due today";
  }

  if (days === 1) {
    return "1 day remaining";
  }

  if (days < 30) {
    return `${days} days remaining`;
  }

  if (days < 60) {
    return "About 1 month remaining";
  }

  const months = Math.round(days / 30);

  return `${months} months remaining`;
}

function getGoalIcon(goal: Goal) {
  if (goal.icon) {
    return goal.icon;
  }

  return "target";
}

function getGoalIconComponent(
  icon: string | null,
) {
  switch (icon?.toLowerCase()) {
    case "shield":
      return CircleDollarSign;

    case "trending":
    case "investment":
      return TrendingUp;

    case "calendar":
      return CalendarDays;

    default:
      return Target;
  }
}

function calculateSummary(goals: Goal[]) {
  return goals.reduce(
    (summary, goal) => {
      const target = Number(goal.target_amount) || 0;
      const current =
        Number(goal.current_amount) || 0;

      summary.totalTarget += target;
      summary.totalCurrent += current;

      if (goal.is_completed) {
        summary.completed += 1;
      } else {
        summary.active += 1;
      }

      return summary;
    },
    {
      totalTarget: 0,
      totalCurrent: 0,
      completed: 0,
      active: 0,
    },
  );
}

export default async function GoalsPage() {
  let goals: Goal[] = [];
  let error = false;

  try {
    const response = await getGoals();
    goals = response.items;
  } catch (err) {
    console.error(
      "Failed to load goals:",
      err,
    );

    error = true;
  }

  const summary = calculateSummary(goals);

  const overallProgress =
    summary.totalTarget > 0
      ? Math.min(
          Math.max(
            (summary.totalCurrent /
              summary.totalTarget) *
              100,
            0,
          ),
          100,
        )
      : 0;

  return (
    <main className={styles.page}>
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            FINANCIAL PLANNING
          </p>

          <h1>Goals</h1>

          <p className={styles.subtitle}>
            Turn your plans into achievable financial
            milestones.
          </p>
        </div>

        <Link
          href="/goals/new"
          className={styles.addButton}
        >
          <Plus size={18} />
          Create Goal
        </Link>
      </header>

      {/* ================================================== */}
      {/* SUMMARY */}
      {/* ================================================== */}

      {!error && goals.length > 0 && (
        <section
          className={styles.summaryGrid}
          aria-label="Goals summary"
        >
          <article className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <span>Total Goals</span>

              <span
                className={`${styles.summaryIcon} ${styles.summaryIconGreen}`}
              >
                <Target
                  size={16}
                  strokeWidth={1.9}
                />
              </span>
            </div>

            <strong>{goals.length}</strong>

            <p>
              {summary.active} active
              {summary.completed > 0
                ? ` · ${summary.completed} completed`
                : ""}
            </p>
          </article>

          <article className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <span>Total Target</span>

              <span
                className={`${styles.summaryIcon} ${styles.summaryIconGold}`}
              >
                <CircleDollarSign
                  size={16}
                  strokeWidth={1.9}
                />
              </span>
            </div>

            <strong>
              {formatCurrency(
                summary.totalTarget,
              )}
            </strong>

            <p>
              Across all your goals
            </p>
          </article>

          <article className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <span>Saved So Far</span>

              <span
                className={`${styles.summaryIcon} ${styles.summaryIconGreen}`}
              >
                <TrendingUp
                  size={16}
                  strokeWidth={1.9}
                />
              </span>
            </div>

            <strong>
              {formatCurrency(
                summary.totalCurrent,
              )}
            </strong>

            <p>
              {overallProgress.toFixed(0)}% of
              total target
            </p>
          </article>

          <article className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <span>Remaining</span>

              <span
                className={`${styles.summaryIcon} ${styles.summaryIconNeutral}`}
              >
                <ArrowRight
                  size={16}
                  strokeWidth={1.9}
                />
              </span>
            </div>

            <strong>
              {formatCurrency(
                Math.max(
                  summary.totalTarget -
                    summary.totalCurrent,
                  0,
                ),
              )}
            </strong>

            <p>
              Still needed to reach targets
            </p>
          </article>
        </section>
      )}

      {/* ================================================== */}
      {/* GOALS */}
      {/* ================================================== */}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>
              YOUR GOALS
            </p>

            <h2>
              Financial milestones
            </h2>
          </div>

          {goals.length > 0 && (
            <span className={styles.goalCount}>
              {goals.length}{" "}
              {goals.length === 1
                ? "goal"
                : "goals"}
            </span>
          )}
        </div>

        {error ? (
          <div className={styles.emptyState}>
            <div
              className={`${styles.emptyIcon} ${styles.emptyIconError}`}
            >
              !
            </div>

            <strong>
              Unable to load your goals
            </strong>

            <span>
              Make sure the FastAPI backend is
              running on port 8001 and try again.
            </span>
          </div>
        ) : goals.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Target
                size={25}
                strokeWidth={1.7}
              />
            </div>

            <strong>
              No financial goals yet
            </strong>

            <span>
              Create your first goal to start
              tracking something important to you.
            </span>

            <Link
              href="/goals/new"
              className={styles.emptyButton}
            >
              <Plus size={17} />
              Create Your First Goal
            </Link>
          </div>
        ) : (
          <div className={styles.goalGrid}>
            {goals.map((goal) => {
              const progress =
                getProgressPercentage(goal);

              const remaining =
                getRemainingAmount(goal);

              const iconName =
                getGoalIcon(goal);

              const Icon =
                getGoalIconComponent(
                  iconName,
                );

              return (
                <article
                  key={goal.id}
                  className={`${styles.goalCard} ${
                    goal.is_completed
                      ? styles.goalCompleted
                      : ""
                  }`}
                >
                  {/* Goal Header */}

                  <div className={styles.goalTop}>
                    <div
                      className={
                        styles.goalIdentity
                      }
                    >
                      <div
                        className={
                          styles.goalIcon
                        }
                      >
                        {goal.is_completed ? (
                          <CheckCircle2
                            size={20}
                            strokeWidth={1.8}
                          />
                        ) : (
                          <Icon
                            size={20}
                            strokeWidth={1.8}
                          />
                        )}
                      </div>

                      <div
                        className={
                          styles.goalNameWrapper
                        }
                      >
                        <h3>
                          {goal.name}
                        </h3>

                        {goal.description && (
                          <p>
                            {
                              goal.description
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    {goal.is_completed && (
                      <span
                        className={
                          styles.completedBadge
                        }
                      >
                        Completed
                      </span>
                    )}
                  </div>

                  {/* Amount */}

                  <div
                    className={
                      styles.amountRow
                    }
                  >
                    <div>
                      <span
                        className={
                          styles.currentAmount
                        }
                      >
                        {formatCurrency(
                          goal.current_amount,
                        )}
                      </span>

                      <span
                        className={
                          styles.amountSeparator
                        }
                      >
                        {" "}
                        /{" "}
                      </span>

                      <span
                        className={
                          styles.targetAmount
                        }
                      >
                        {formatCurrency(
                          goal.target_amount,
                        )}
                      </span>
                    </div>

                    <strong
                      className={
                        styles.progressPercentage
                      }
                    >
                      {progress.toFixed(0)}%
                    </strong>
                  </div>

                  {/* Progress */}

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

                  {/* Goal Metadata */}

                  <div
                    className={
                      styles.goalMeta
                    }
                  >
                    <span>
                      {goal.is_completed
                        ? "Target reached"
                        : `${formatCurrency(
                            remaining,
                          )} remaining`}
                    </span>

                    <span>
                      <CalendarDays
                        size={13}
                        strokeWidth={1.8}
                      />

                      {formatTargetDate(
                        goal.target_date,
                      )}
                    </span>
                  </div>

                  {!goal.is_completed && (
                    <div
                      className={
                        styles.deadline
                      }
                    >
                      {getDateLabel(
                        goal.target_date,
                      )}
                    </div>
                  )}

                  {/* Actions */}

                  <div
                    className={
                      styles.goalActions
                    }
                  >
                    <Link
                      href={`/goals/${goal.id}`}
                      className={
                        styles.viewButton
                      }
                    >
                      View details
                      <ArrowRight
                        size={14}
                      />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}