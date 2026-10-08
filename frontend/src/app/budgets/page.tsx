import Link from "next/link";
import { Plus } from "lucide-react";

import { getServerBudgets } from "@/lib/api/serverBudgets";
import type { Budget } from "@/lib/api/budgets";

import styles from "./budgets.module.scss";

type BudgetsPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

function getCurrentMonth(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatCurrency(value: string | number): string {
  const amount = Number(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonth(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getProgressPercentage(budget: Budget): number {
  const percentage = Number(budget.percentage_used);

  if (!Number.isFinite(percentage)) {
    return 0;
  }

  return Math.min(Math.max(percentage, 0), 100);
}

function getStatusLabel(status: Budget["status"]): string {
  switch (status) {
    case "WARNING":
      return "Warning";
    case "EXCEEDED":
      return "Exceeded";
    default:
      return "On Track";
  }
}

function getStatusClass(status: Budget["status"]): string {
  switch (status) {
    case "WARNING":
      return styles.statusWarning;
    case "EXCEEDED":
      return styles.statusExceeded;
    default:
      return styles.statusOnTrack;
  }
}

function getMonthNavigation(month: string, offset: number): string {
  const date = new Date(`${month}T00:00:00`);

  date.setMonth(date.getMonth() + offset);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
}

function calculateSummary(budgets: Budget[]) {
  const overallBudget = budgets.find(
    (budget) => budget.category_id === null,
  );

  if (overallBudget) {
    return {
      totalBudget: Number(overallBudget.amount),
      totalSpent: Number(overallBudget.spent),
      totalRemaining: Number(overallBudget.remaining),
      usesOverallBudget: true,
    };
  }

  return budgets.reduce(
    (summary, budget) => {
      summary.totalBudget += Number(budget.amount);
      summary.totalSpent += Number(budget.spent);
      summary.totalRemaining += Number(budget.remaining);

      return summary;
    },
    {
      totalBudget: 0,
      totalSpent: 0,
      totalRemaining: 0,
      usesOverallBudget: false,
    },
  );
}

export default async function BudgetsPage({
  searchParams,
}: BudgetsPageProps) {
  const params = await searchParams;

  const selectedMonth = params.month || getCurrentMonth();

  let budgets: Budget[] = [];
  let error = false;

  try {
    const response = await getServerBudgets(selectedMonth);
    budgets = response.items;
  } catch (err) {
    console.error("Failed to load budgets:", err);
    error = true;
  }

  const summary = calculateSummary(budgets);

  const overallPercentage =
    summary.totalBudget > 0
      ? Math.min(
          Math.max(
            (summary.totalSpent / summary.totalBudget) * 100,
            0,
          ),
          100,
        )
      : 0;

  const intelligenceBudget =
    budgets.find((budget) => budget.category_id === null) ??
    null;

  const totalProjectedOverspend = intelligenceBudget
    ? Math.max(Number(intelligenceBudget.projected_overspend), 0)
    : budgets.reduce(
        (total, budget) =>
          total + Math.max(Number(budget.projected_overspend), 0),
        0,
      );

  const totalSafeDailySpend = intelligenceBudget
    ? Math.max(Number(intelligenceBudget.safe_daily_spend), 0)
    : budgets.reduce(
        (total, budget) =>
          total + Math.max(Number(budget.safe_daily_spend), 0),
        0,
      );

  const previousMonth = getMonthNavigation(selectedMonth, -1);
  const nextMonth = getMonthNavigation(selectedMonth, 1);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>SPENDING PLAN</p>

          <h1>Budgets</h1>

          <p className={styles.subtitle}>
            Set monthly spending limits and stay on top of your expenses.
          </p>
        </div>

        <Link href="/budgets/new" className={styles.addButton}>
          <Plus size={18} />
          Add Budget
        </Link>
      </header>

      <section className={styles.monthFilter}>
        <div>
          <p className={styles.sectionEyebrow}>MONTHLY VIEW</p>

          <h2>{formatMonth(selectedMonth)}</h2>
        </div>

        <div className={styles.monthNavigation}>
          <Link
            href={`/budgets?month=${previousMonth}`}
            className={styles.monthButton}
            aria-label="Previous month"
          >
            ←
          </Link>

          <Link
            href={`/budgets?month=${getCurrentMonth()}`}
            className={styles.todayButton}
          >
            This month
          </Link>

          <Link
            href={`/budgets?month=${nextMonth}`}
            className={styles.monthButton}
            aria-label="Next month"
          >
            →
          </Link>
        </div>
      </section>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <div className={styles.summaryLabel}>
            {summary.usesOverallBudget
              ? "Overall Budget"
              : "Total Category Budgets"}
          </div>

          <div className={styles.summaryValue}>
            {formatCurrency(summary.totalBudget)}
          </div>

          <div className={styles.summaryDescription}>
            {summary.usesOverallBudget
              ? "Your overall spending limit for the month"
              : "Combined limits across your category budgets"}
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Spent</div>

          <div className={styles.summaryValue}>
            {formatCurrency(summary.totalSpent)}
          </div>

          <div className={styles.summaryDescription}>
            {overallPercentage.toFixed(0)}% of total budget used
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Remaining</div>

          <div className={styles.summaryValue}>
            {formatCurrency(summary.totalRemaining)}
          </div>

          <div className={styles.summaryDescription}>
            Available across your budgets
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Safe Daily Spend</div>

          <div className={styles.summaryValue}>
            {formatCurrency(totalSafeDailySpend)}
          </div>

          <div className={styles.summaryDescription}>
            Combined amount you can spend per day
          </div>
        </article>
      </section>

      {totalProjectedOverspend > 0 && (
        <section className={styles.intelligenceBanner}>
          <div className={styles.intelligenceIcon}>!</div>
          <div>
            <strong>Budget forecast needs attention</strong>
            <span>
              Current spending trends could put you about{" "}
              {formatCurrency(totalProjectedOverspend)} over budget this month.
            </span>
          </div>
        </section>
      )}

      <section className={styles.card}>
        {error ? (
          <div className={styles.emptyState}>
            <strong>Unable to load budgets</strong>

            <span>
              Make sure the FastAPI backend is running on port 8001.
            </span>
          </div>
        ) : budgets.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>₹</div>

            <strong>No budgets for this month</strong>

            <span>
              Create your first monthly budget to start tracking your
              spending.
            </span>

            <Link href="/budgets/new" className={styles.emptyButton}>
              <Plus size={17} />
              Create Budget
            </Link>
          </div>
        ) : (
          <div className={styles.budgetList}>
            {budgets.map((budget) => {
              const progress = getProgressPercentage(budget);

              return (
                <article key={budget.id} className={styles.budgetCard}>
                  <div className={styles.budgetTop}>
                    <div>
                      <div className={styles.budgetName}>
                        {budget.category_name || budget.name}
                      </div>

                      {budget.category_name && (
                        <div className={styles.budgetType}>
                          Monthly category budget
                        </div>
                      )}
                    </div>

                    <span
                      className={`${styles.status} ${getStatusClass(
                        budget.status,
                      )}`}
                    >
                      {getStatusLabel(budget.status)}
                    </span>
                  </div>

                  <div className={styles.amountRow}>
                    <div>
                      <span className={styles.spentAmount}>
                        {formatCurrency(budget.spent)}
                      </span>

                      <span className={styles.amountSeparator}> / </span>

                      <span className={styles.budgetAmount}>
                        {formatCurrency(budget.amount)}
                      </span>
                    </div>

                    <span className={styles.percentage}>
                      {Number(budget.percentage_used).toFixed(0)}%
                    </span>
                  </div>

                  <div className={styles.progressTrack}>
                    <div
                      className={`${styles.progressBar} ${
                        budget.status === "EXCEEDED"
                          ? styles.progressExceeded
                          : budget.status === "WARNING"
                            ? styles.progressWarning
                            : styles.progressOnTrack
                      }`}
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <div className={styles.budgetBottom}>
                    <span>
                      {Number(budget.remaining) >= 0
                        ? `${formatCurrency(budget.remaining)} remaining`
                        : `${formatCurrency(Math.abs(Number(budget.remaining)))} over budget`}
                    </span>

                    <span>
                      {budget.days_remaining > 0
                        ? `${budget.days_remaining} days left`
                        : "Period ended"}
                    </span>
                  </div>

                  <div className={styles.intelligenceRow}>
                    <div>
                      <span>Safe daily spend</span>
                      <strong>{formatCurrency(budget.safe_daily_spend)}</strong>
                    </div>

                    <div>
                      <span>Projected spend</span>
                      <strong>
                        {budget.projected_spend
                          ? formatCurrency(budget.projected_spend)
                          : "—"}
                      </strong>
                    </div>
                  </div>

                  <div
                    className={`${styles.budgetInsight} ${
                      budget.status === "EXCEEDED"
                        ? styles.budgetInsightDanger
                        : budget.status === "WARNING"
                          ? styles.budgetInsightWarning
                          : ""
                    }`}
                  >
                    {budget.insight}
                  </div>
                  <div className={styles.budgetActions}>
                    <Link
                      href={`/budgets/${budget.id}/edit`}
                      className={styles.secondaryButton}
                    >
                      Edit
                    </Link>

                    <Link
                      href={`/budgets/${budget.id}`}
                      className={styles.viewButton}
                    >
                      View details
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