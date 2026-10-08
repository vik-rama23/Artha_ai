export const dynamic = "force-dynamic";

import Link from "next/link";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  IndianRupee,
  PiggyBank,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { getCurrentUser } from "@/lib/api/auth";
import { getCashFlowForecast } from "@/lib/api/cashFlowForecast";
import { getDashboard } from "@/lib/api/dashboard";
import { getGoals } from "@/lib/api/goalsServer";

import type {
  DashboardData,
  DashboardTransaction,
} from "@/types/dashboard";
import type { CashFlowForecast } from "@/types/cashFlowForecast";
import type { Goal } from "@/types/goal";

import styles from "./page.module.scss";

function formatCurrency(value: string | number) {
  const amount =
    typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(value: string | number) {
  const amount =
    typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }

  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }

  return formatCurrency(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");

  if (!year || !monthNumber) {
    return month;
  }

  const date = new Date(
    Number(year),
    Number(monthNumber) - 1,
    1
  );

  return date.toLocaleDateString("en-IN", {
    month: "short",
  });
}

function formatMonthYear(month: string) {
  const [year, monthNumber] = month.split("-");

  if (!year || !monthNumber) {
    return month;
  }

  const date = new Date(
    Number(year),
    Number(monthNumber) - 1,
    1
  );

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function getFirstName(
  fullName: string | null,
  email: string
) {
  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0];
  }

  return email.split("@")[0] || "there";
}

function getGreeting(timezone: string) {
  let hour = new Date().getHours();

  try {
    const parts = new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).formatToParts(new Date());

    const hourPart = parts.find(
      (part) => part.type === "hour"
    )?.value;

    if (hourPart) {
      hour = Number(hourPart);
    }
  } catch {
    // Fall back to the server's local hour.
  }

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getSavingsRate(
  income: number,
  expense: number
) {
  if (income <= 0) {
    return 0;
  }

  return ((income - expense) / income) * 100;
}

function getCategoryColor(index: number) {
  const colors = [
    "#1f5a43",
    "#c9973e",
    "#a75a31",
    "#6f8f7c",
    "#b8a77d",
    "#315f52",
  ];

  return colors[index % colors.length];
}

function buildDonutGradient(
  data: DashboardData["expenses_by_category"]
) {
  if (!data.length) {
    return "conic-gradient(#e7e1d6 0% 100%)";
  }

  let currentPercentage = 0;

  const segments = data.map((item, index) => {
    const start = currentPercentage;
    const percentage = Number(item.percentage) || 0;

    currentPercentage += percentage;

    return `${getCategoryColor(
      index
    )} ${start}% ${currentPercentage}%`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function getMaxCashFlowValue(
  monthlyCashFlow: DashboardData["monthly_cash_flow"]
) {
  if (!monthlyCashFlow.length) {
    return 1;
  }

  const values = monthlyCashFlow.flatMap((item) => [
    Number(item.income),
    Number(item.expense),
  ]);

  const max = Math.max(...values);

  return max > 0 ? max : 1;
}

function getTransactionTitle(
  transaction: DashboardTransaction
) {
  return (
    transaction.merchant ||
    transaction.description ||
    "Transaction"
  );
}

function getTransactionCategory(
  transaction: DashboardTransaction
) {
  return (
    transaction.category_name ||
    (transaction.transaction_type === "EXPENSE"
      ? "Expense"
      : "Income")
  );
}

function getTransactionAccount(
  transaction: DashboardTransaction
) {
  if (transaction.account_name) {
    return transaction.account_name;
  }

  return "Account";
}

function getAccountInitial(
  accountName: string
) {
  return (
    accountName
      .trim()
      .charAt(0)
      .toUpperCase() || "A"
  );
}

function getGoalProgress(goal: Goal) {
  const target = Number(goal.target_amount) || 0;
  const current = Number(goal.current_amount) || 0;

  if (target <= 0) {
    return 0;
  }

  return Math.min(
    Math.max((current / target) * 100, 0),
    100
  );
}

function getGoalDeadline(goal: Goal) {
  if (!goal.target_date) {
    return "No deadline";
  }

  const target = new Date(
    goal.target_date + "T00:00:00"
  );
  const today = new Date();

  if (Number.isNaN(target.getTime())) {
    return "No deadline";
  }

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const days = Math.ceil(
    (target.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (days < 0) {
    return "Overdue";
  }

  if (days === 0) {
    return "Due today";
  }

  if (days === 1) {
    return "1 day left";
  }

  if (days <= 30) {
    return days + " days left";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(target);
}

function getGoalMonthsRemaining(goal: Goal) {
  const days = getGoalDaysRemaining(goal);

  if (days === null || days <= 0) {
    return null;
  }

  return Math.max(days / 30.4375, 1);
}

function getRecommendedMonthlyContribution(goal: Goal) {
  const current = Number(goal.current_amount) || 0;
  const target = Number(goal.target_amount) || 0;
  const remaining = Math.max(target - current, 0);
  const months = getGoalMonthsRemaining(goal);

  if (remaining <= 0 || months === null) {
    return null;
  }

  return Math.ceil(
    remaining / months / 100
  ) * 100;
}

function getGoalDaysRemaining(goal: Goal) {
  if (!goal.target_date) {
    return null;
  }

  const target = new Date(
    goal.target_date + "T00:00:00"
  );
  const today = new Date();

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function getGoalAttention(goal: Goal) {
  const daysRemaining = getGoalDaysRemaining(goal);
  const current = Number(goal.current_amount) || 0;
  const target = Number(goal.target_amount) || 0;
  const remaining = Math.max(target - current, 0);
  const progress = getGoalProgress(goal);

  if (daysRemaining !== null && daysRemaining < 0) {
    return {
      tone: "overdue",
      label: "Needs attention",
      message:
        "This goal is overdue. Consider updating the target date or increasing your contribution.",
      detail: formatCurrency(remaining) + " remaining",
    };
  }

  if (daysRemaining !== null && daysRemaining <= 30) {
    const timeLabel =
      daysRemaining === 0
        ? "Due today"
        : daysRemaining === 1
          ? "1 day left"
          : daysRemaining + " days left";

    return {
      tone: "dueSoon",
      label: "Due soon",
      message:
        timeLabel +
        ". Prioritize this goal if it is important to you.",
      detail: formatCurrency(remaining) + " remaining",
    };
  }

  if (daysRemaining === null && progress < 50) {
    return {
      tone: "focus",
      label: "Focus goal",
      message:
        "This goal is still below 50%. A regular contribution can help build momentum.",
      detail: formatCurrency(remaining) + " remaining",
    };
  }

  return {
    tone: "focus",
    label: "Next focus",
    message:
      "Keep building this goal with consistent contributions.",
    detail: formatCurrency(remaining) + " remaining",
  };
}

function getFinancialHealth(
  savingsRate: number,
  net: number,
  goalProgress: number,
  goalCount: number
) {
  const savingsScore = savingsRate >= 30 ? 40 : savingsRate >= 20 ? 34 : savingsRate >= 10 ? 26 : savingsRate > 0 ? 16 : 5;
  const cashFlowScore = net > 0 ? 30 : net === 0 ? 20 : 5;
  const goalScore = goalCount === 0 ? 20 : goalProgress >= 75 ? 30 : goalProgress >= 50 ? 25 : goalProgress >= 25 ? 18 : 10;
  const score = Math.min(savingsScore + cashFlowScore + goalScore, 100);
  const label = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Needs attention";
  const message = score >= 80 ? "Your savings, cash flow and goals are working well together." : score >= 65 ? "You have a solid foundation. A few focused improvements can strengthen it further." : score >= 50 ? "Your finances are moving, but there are a few areas worth improving." : "Your current cash flow needs attention before focusing on bigger financial goals.";
  const primaryInsight = savingsRate < 10 ? "Increase your monthly savings rate." : net <= 0 ? "Bring monthly expenses below income." : goalCount > 0 && goalProgress < 25 ? "Increase contributions toward your goals." : "Keep your current financial habits consistent.";
  return { score, label, message, primaryInsight };
}

function getMonthlyChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function getMonthlyReviewInsight(
  income: number,
  expense: number,
  previousExpense: number,
  savingsRate: number,
  topCategory: DashboardData["expenses_by_category"][number] | null
) {
  const expenseChange = getMonthlyChange(
    expense,
    previousExpense
  );

  if (expenseChange !== null && expenseChange > 10) {
    return "Expenses increased this month. Review your largest spending category.";
  }

  if (savingsRate >= 25) {
    return "Strong savings month. Consider directing part of the surplus toward your highest-priority goal.";
  }

  if (expense > income) {
    return "Expenses are above income this month. Focus on discretionary spending before increasing contributions.";
  }

  if (topCategory) {
    return topCategory.category_name + " is your largest spending category this month.";
  }

  return "Keep recording transactions consistently to make your monthly review more useful.";
}

function getCashFlowMessage(
  net: number,
  savingsRate: number
) {
  if (net > 0 && savingsRate >= 20) {
    return "Your cash flow is positive and your savings rate is healthy this month.";
  }

  if (net > 0) {
    return "Your cash flow is positive this month. Keep an eye on discretionary spending.";
  }

  if (net === 0) {
    return "Your income and expenses are currently balanced this month.";
  }

  return "Your expenses are higher than your income this month.";
}

export default async function DashboardPage() {
  let dashboard: DashboardData | null = null;
  let currentUser = null;
  let goals: Goal[] = [];
  let forecast: CashFlowForecast | null = null;
  let errorMessage = "";

  try {
    [dashboard, currentUser] =
      await Promise.all([
        getDashboard(),
        getCurrentUser(),
      ]);
  } catch (error) {
    /*
     * Next.js redirect() throws an internal
     * NEXT_REDIRECT signal.
     *
     * Do not swallow that signal.
     */
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error(
      "Failed to load dashboard:",
      error
    );

    errorMessage =
      "Unable to connect to the Artha backend.";
  }

  try {
    const goalsResponse = await getGoals();
    goals = goalsResponse.items;
  } catch (error) {
    console.error(
      "Failed to load dashboard goals:",
      error
    );
  }

  try {
    forecast = await getCashFlowForecast();
  } catch (error) {
    console.error(
      "Failed to load cash flow forecast:",
      error
    );
  }

  if (!dashboard) {
    return (
      <main className={styles.dashboard}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>
            !
          </div>

          <h1>
            Dashboard unavailable
          </h1>

          <p>
            {errorMessage ||
              "Something went wrong while loading your financial data."}
          </p>

          <p className={styles.errorHint}>
            Make sure the FastAPI backend is
            running on port 8001.
          </p>
        </div>
      </main>
    );
  }

  const balance = Number(dashboard.balance) || 0;
  const income = Number(dashboard.income) || 0;
  const expense = Number(dashboard.expense) || 0;
  const net = Number(dashboard.net) || 0;

  const savingsRate = getSavingsRate(
    income,
    expense
  );

  const categories =
    dashboard.expenses_by_category ?? [];

  const monthlyCashFlow =
    dashboard.monthly_cash_flow ?? [];

  const transactions =
    dashboard.recent_transactions ?? [];

  const maxCashFlowValue =
    getMaxCashFlowValue(monthlyCashFlow);

  const visibleMonths =
    monthlyCashFlow.slice(-6);

  const latestMonth =
    monthlyCashFlow.length > 0
      ? monthlyCashFlow[
          monthlyCashFlow.length - 1
        ]
      : null;

  /*
   * Account information is currently available
   * through the enriched recent transactions.
   *
   * We intentionally do not invent account
   * balances here. The authoritative total
   * balance comes from the Dashboard API.
   */
  const accountMap = new Map<
    string,
    {
      name: string;
      institution: string | null;
      transactionCount: number;
    }
  >();

  for (const transaction of transactions) {
    const existing = accountMap.get(
      transaction.account_id
    );

    if (existing) {
      existing.transactionCount += 1;
      continue;
    }

    accountMap.set(
      transaction.account_id,
      {
        name:
          transaction.account_name ||
          "Account",
        institution:
          transaction.account_institution_name,
        transactionCount: 1,
      }
    );
  }

  const accountActivity = Array.from(
    accountMap.entries()
  ).slice(0, 4);

  const activeGoals = goals
    .filter((goal) => !goal.is_completed)
    .sort((a, b) => {
      const aProgress = getGoalProgress(a);
      const bProgress = getGoalProgress(b);

      return bProgress - aProgress;
    })
    .slice(0, 3);

  const completedGoals = goals.filter(
    (goal) => goal.is_completed
  ).length;

  const totalGoalTarget = goals.reduce(
    (total, goal) =>
      total + (Number(goal.target_amount) || 0),
    0
  );

  const totalGoalSaved = goals.reduce(
    (total, goal) =>
      total + (Number(goal.current_amount) || 0),
    0
  );

  const totalGoalProgress =
    totalGoalTarget > 0
      ? Math.min(
          Math.max(
            (totalGoalSaved / totalGoalTarget) * 100,
            0
          ),
          100
        )
      : 0;

  const financialHealth = getFinancialHealth(
    savingsRate,
    net,
    totalGoalProgress,
    goals.length
  );

  const attentionGoal = activeGoals
    .slice()
    .sort((a, b) => {
      const aDays = getGoalDaysRemaining(a);
      const bDays = getGoalDaysRemaining(b);

      if (
        aDays !== null &&
        aDays < 0 &&
        !(bDays !== null && bDays < 0)
      ) {
        return -1;
      }

      if (
        bDays !== null &&
        bDays < 0 &&
        !(aDays !== null && aDays < 0)
      ) {
        return 1;
      }

      if (aDays !== null && bDays !== null) {
        return aDays - bDays;
      }

      if (aDays !== null) {
        return -1;
      }

      if (bDays !== null) {
        return 1;
      }

      return getGoalProgress(a) - getGoalProgress(b);
    })[0] ?? null;

  const attention =
    attentionGoal
      ? getGoalAttention(attentionGoal)
      : null;

  const previousMonth =
    monthlyCashFlow.length > 1
      ? monthlyCashFlow[monthlyCashFlow.length - 2]
      : null;

  const currentReviewIncome = latestMonth
    ? Number(latestMonth.income) || 0
    : income;
  const currentReviewExpense = latestMonth
    ? Number(latestMonth.expense) || 0
    : expense;
  const previousReviewExpense = previousMonth
    ? Number(previousMonth.expense) || 0
    : 0;
  const currentReviewNet =
    currentReviewIncome - currentReviewExpense;
  const currentReviewSavingsRate =
    getSavingsRate(
      currentReviewIncome,
      currentReviewExpense
    );
  const expenseChange = getMonthlyChange(
    currentReviewExpense,
    previousReviewExpense
  );
  const topCategories =
    [...categories]
      .sort(
        (a, b) =>
          Number(b.amount) -
          Number(a.amount)
      )
      .slice(0, 5);

  const reviewInsight = getMonthlyReviewInsight(
    currentReviewIncome,
    currentReviewExpense,
    previousReviewExpense,
    currentReviewSavingsRate,
    topCategories[0] ?? null
  );

  const recommendedGoal = activeGoals
    .map((goal) => ({
      goal,
      monthly: getRecommendedMonthlyContribution(goal),
    }))
    .filter(
      (
        item
      ): item is {
        goal: Goal;
        monthly: number;
      } => item.monthly !== null
    )
    .sort(
      (a, b) =>
        b.monthly - a.monthly
    )[0] ?? null;

  return (
    <main className={styles.dashboard}>
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Overview
          </p>

          <h1>
            {getGreeting(
              currentUser?.timezone ??
                "Asia/Kolkata"
            )}
            ,{" "}
            {getFirstName(
              currentUser?.full_name ?? null,
              currentUser?.email ?? "there"
            )}
          </h1>

          <p className={styles.subtitle}>
            Here&apos;s your financial snapshot
            for this month.
          </p>
        </div>

        <div className={styles.dashboardHealth}>
          <span>Financial health</span>
          <strong>{financialHealth.score}/100</strong>
          <small>{financialHealth.label}</small>
        </div>

        <Link
          href="/transactions/new"
          className={styles.addButton}
        >
          + Add Transaction
        </Link>
      </header>

      {/* ================================================== */}
      {/* SUMMARY CARDS */}
      {/* ================================================== */}

      <section
        className={styles.summaryGrid}
        aria-label="Financial summary"
      >
        <article
          className={`${styles.summaryCard} ${styles.balanceCard}`}
        >
          <div className={styles.cardTop}>
            <span>
              Total Balance
            </span>

            <div className={styles.iconWrapper}>
              <Wallet
                size={19}
                strokeWidth={1.8}
              />
            </div>
          </div>

          <strong>
            {formatCurrency(balance)}
          </strong>

          <p>
            Across all accounts
          </p>
        </article>

        <article
          className={`${styles.summaryCard} ${styles.incomeCard}`}
        >
          <div className={styles.cardTop}>
            <span>
              Income
            </span>

            <div className={styles.iconWrapper}>
              <ArrowUpRight
                size={19}
                strokeWidth={1.8}
              />
            </div>
          </div>

          <strong>
            {formatCurrency(income)}
          </strong>

          <p>
            This month
          </p>
        </article>

        <article
          className={`${styles.summaryCard} ${styles.expenseCard}`}
        >
          <div className={styles.cardTop}>
            <span>
              Expenses
            </span>

            <div className={styles.iconWrapper}>
              <ArrowDownRight
                size={19}
                strokeWidth={1.8}
              />
            </div>
          </div>

          <strong>
            {formatCurrency(expense)}
          </strong>

          <p>
            This month
          </p>
        </article>

        <article
          className={`${styles.summaryCard} ${styles.savingsCard}`}
        >
          <div className={styles.cardTop}>
            <span>
              Savings Rate
            </span>

            <div className={styles.iconWrapper}>
              <PiggyBank
                size={19}
                strokeWidth={1.8}
              />
            </div>
          </div>

          <strong>
            {savingsRate.toFixed(1)}%
          </strong>

          <p>
            {formatCurrency(net)} saved
            this month
          </p>
        </article>
      </section>

      {/* ================================================== */}
      {/* CASH FLOW + EXPENSE BREAKDOWN */}
      {/* ================================================== */}

      <section className={styles.contentGrid}>
        {/* ---------------------------------------------- */}
        {/* CASH FLOW */}
        {/* ---------------------------------------------- */}

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>
                Cash Flow
              </h2>

              <p>
                Last 6 months
              </p>
            </div>

            <Link
              href="/analytics"
              className={styles.textButton}
            >
              Analytics
              <ArrowRight
                size={13}
              />
            </Link>
          </div>

          <div
            className={
              styles.cashFlowSummary
            }
          >
            <div>
              <span>
                Current net
              </span>

              <strong
                className={
                  net >= 0
                    ? styles.positiveAmount
                    : styles.negativeAmount
                }
              >
                {formatCurrency(net)}
              </strong>
            </div>

            {latestMonth && (
              <div
                className={
                  styles.cashFlowPeriod
                }
              >
                <span>
                  {formatMonthYear(
                    latestMonth.month
                  )}
                </span>

                <small>
                  Income{" "}
                  {formatCompactCurrency(
                    latestMonth.income
                  )}
                </small>
              </div>
            )}
          </div>

          {visibleMonths.length === 0 ? (
            <div
              className={styles.emptyState}
            >
              No cash-flow data available
              yet.
            </div>
          ) : (
            <div
              className={styles.cashFlowChart}
            >
              <div
                className={
                  styles.cashFlowLegend
                }
              >
                <span>
                  <i
                    className={
                      styles.legendIncome
                    }
                  />
                  Income
                </span>

                <span>
                  <i
                    className={
                      styles.legendExpense
                    }
                  />
                  Expense
                </span>
              </div>

              <div
                className={
                  styles.cashFlowBars
                }
              >
                {visibleMonths.map(
                  (month) => {
                    const monthIncome =
                      Number(
                        month.income
                      );

                    const monthExpense =
                      Number(
                        month.expense
                      );

                    const incomeHeight =
                      Math.max(
                        (monthIncome /
                          maxCashFlowValue) *
                          100,
                        monthIncome > 0
                          ? 6
                          : 0
                      );

                    const expenseHeight =
                      Math.max(
                        (monthExpense /
                          maxCashFlowValue) *
                          100,
                        monthExpense > 0
                          ? 6
                          : 0
                      );

                    return (
                      <div
                        key={
                          month.month
                        }
                        className={
                          styles.cashFlowMonth
                        }
                      >
                        <div
                          className={
                            styles.cashFlowColumns
                          }
                        >
                          <div
                            className={
                              styles.cashFlowBarTrack
                            }
                          >
                            <div
                              className={
                                styles.cashFlowIncomeBar
                              }
                              style={{
                                height:
                                  `${incomeHeight}%`,
                              }}
                              title={`Income: ${formatCurrency(
                                monthIncome
                              )}`}
                            />
                          </div>

                          <div
                            className={
                              styles.cashFlowBarTrack
                            }
                          >
                            <div
                              className={
                                styles.cashFlowExpenseBar
                              }
                              style={{
                                height:
                                  `${expenseHeight}%`,
                              }}
                              title={`Expense: ${formatCurrency(
                                monthExpense
                              )}`}
                            />
                          </div>
                        </div>

                        <span>
                          {formatMonth(
                            month.month
                          )}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </article>

        {/* ---------------------------------------------- */}
        {/* EXPENSE BREAKDOWN */}
        {/* ---------------------------------------------- */}

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>
                Spending Overview
              </h2>

              <p>
                This month
              </p>
            </div>

            <Link
              href="/analytics"
              className={styles.textButton}
            >
              View details
              <ArrowRight
                size={13}
              />
            </Link>
          </div>

          {categories.length === 0 ? (
            <div
              className={styles.emptyState}
            >
              No expenses recorded this
              month.
            </div>
          ) : (
            <div
              className={
                styles.spendingOverview
              }
            >
              <div
                className={styles.donutWrapper}
              >
                <div
                  className={styles.donut}
                  style={{
                    background:
                      buildDonutGradient(
                        categories
                      ),
                  }}
                >
                  <div
                    className={
                      styles.donutInner
                    }
                  >
                    <strong>
                      {formatCompactCurrency(
                        expense
                      )}
                    </strong>

                    <span>
                      Expenses
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={
                  styles.categoryList
                }
              >
                {topCategories.map(
                  (
                    category,
                    index
                  ) => (
                    <div
                      key={
                        category.category_id
                      }
                      className={
                        styles.categoryRow
                      }
                    >
                      <div>
                        <span
                          className={
                            styles.categoryName
                          }
                        >
                          <i
                            className={
                              styles.categoryDot
                            }
                            style={{
                              background:
                                getCategoryColor(
                                  index
                                ),
                            }}
                          />

                          {
                            category.category_name
                          }
                        </span>

                        <small>
                          {Number(
                            category.percentage
                          ).toFixed(1)}
                          %
                        </small>
                      </div>

                      <strong>
                        {formatCurrency(
                          category.amount
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </article>
      </section>

      {/* ================================================== */}
      {/* FINANCIAL SNAPSHOT */}
      {/* ================================================== */}

      <section className={styles.snapshotCard}>
        <div
          className={
            styles.snapshotIcon
          }
        >
          <IndianRupee
            size={21}
            strokeWidth={1.8}
          />
        </div>

        <div
          className={
            styles.snapshotContent
          }
        >
          <span>
            Monthly cash-flow snapshot
          </span>

          <strong>
            {getCashFlowMessage(
              net,
              savingsRate
            )}
          </strong>
        </div>

        <Link
          href="/analytics"
          className={
            styles.snapshotLink
          }
        >
          Explore analytics
          <ArrowRight size={14} />
        </Link>
      </section>


      {/* ================================================== */}
      {/* THIS MONTH */}
      {/* ================================================== */}

      <section className={styles.monthlyReviewStrip}>
        <div className={styles.monthlyReviewStripTitle}>
          <span>This month</span>
          <strong>
            {latestMonth
              ? formatMonthYear(latestMonth.month)
              : "Current month"}
          </strong>
        </div>

        <div className={styles.monthlyReviewStripMetrics}>
          <div>
            <span>Income</span>
            <strong>{formatCompactCurrency(currentReviewIncome)}</strong>
          </div>
          <div>
            <span>Expenses</span>
            <strong>{formatCompactCurrency(currentReviewExpense)}</strong>
            <small>
              {expenseChange === null
                ? "No previous data"
                : (expenseChange > 0 ? "+" : "") +
                  expenseChange.toFixed(0) +
                  "% vs last month"}
            </small>
          </div>
          <div>
            <span>Saved</span>
            <strong>{formatCompactCurrency(currentReviewNet)}</strong>
          </div>
          <div>
            <span>Savings rate</span>
            <strong>{Math.max(currentReviewSavingsRate, 0).toFixed(0)}%</strong>
          </div>
        </div>

        <div className={styles.monthlyReviewStripInsight}>
          <TrendingUp size={14} strokeWidth={1.9} />
          <span>{reviewInsight}</span>
        </div>
      </section>

      {/* ================================================== */}
      {/* CASH FLOW FORECAST */}
      {/* ================================================== */}

      {forecast && (
        <section className={styles.forecastStrip}>
          <div className={styles.forecastHeader}>
            <div>
              <span>Cash flow forecast</span>
              <strong>
                Projected month-end balance
              </strong>
            </div>

            <span
              className={`${styles.forecastStatus} ${styles["forecastStatus" + forecast.status]}`}
            >
              {forecast.status === "HEALTHY"
                ? "Healthy"
                : forecast.status === "WATCH"
                  ? "Watch"
                  : "At risk"}
            </span>
          </div>

          <div className={styles.forecastBalance}>
            <strong>
              {formatCurrency(
                forecast.projected_month_end_balance
              )}
            </strong>

            <span>
              {forecast.days_remaining === 0
                ? "Month ends today"
                : `${forecast.days_remaining} days remaining`}
            </span>
          </div>

          <div className={styles.forecastMetrics}>
            <div>
              <span>Current balance</span>
              <strong>
                {formatCompactCurrency(
                  forecast.current_balance
                )}
              </strong>
            </div>

            <div>
              <span>Expected income</span>
              <strong>
                {formatCompactCurrency(
                  forecast.expected_recurring_income
                )}
              </strong>
            </div>

            <div>
              <span>Expected expenses</span>
              <strong>
                {formatCompactCurrency(
                  forecast.projected_expense
                )}
              </strong>
            </div>

            <div>
              <span>Daily variable spend</span>
              <strong>
                {formatCompactCurrency(
                  forecast.average_daily_variable_expense
                )}
              </strong>
            </div>
          </div>

          <div className={styles.forecastInsight}>
            <TrendingUp size={14} strokeWidth={1.9} />
            <span>{forecast.insight}</span>
          </div>
        </section>
      )}

      {/* ================================================== */}
      {/* FINANCIAL GOALS */}
      {/* ================================================== */}

      <section className={styles.goalsCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Financial Goals</h2>

            <p>
              {goals.length === 0
                ? "Turn your plans into achievable financial milestones."
                : goals.length +
                  (goals.length === 1
                    ? " goal"
                    : " goals") +
                  " · " +
                  completedGoals +
                  " completed"}
            </p>
          </div>

          <Link
            href="/goals"
            className={styles.textButton}
          >
            View all
            <ArrowRight size={13} />
          </Link>
        </div>

        {goals.length === 0 ? (
          <div className={styles.goalsEmpty}>
            <div className={styles.goalsEmptyIcon}>
              <Target size={19} strokeWidth={1.8} />
            </div>

            <div className={styles.goalsEmptyContent}>
              <strong>No financial goals yet</strong>

              <span>
                Create a goal to start tracking your progress.
              </span>
            </div>

            <Link
              href="/goals/new"
              className={styles.goalCreateButton}
            >
              Create goal
              <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.goalsSummary}>
              <div className={styles.goalsSummaryValue}>
                <span>Saved across goals</span>
                <strong>
                  {formatCurrency(totalGoalSaved)}
                </strong>
              </div>

              <div className={styles.goalsSummaryProgress}>
                <div className={styles.goalsSummaryLabels}>
                  <span>
                    {totalGoalProgress.toFixed(0)}% of total target
                  </span>

                  <span>
                    {formatCurrency(totalGoalTarget)}
                  </span>
                </div>

                <div className={styles.goalsProgressTrack}>
                  <div
                    className={styles.goalsProgressBar}
                    style={{
                      width: totalGoalProgress + "%",
                    }}
                  />
                </div>
              </div>
            </div>

            {attentionGoal && (
              <Link
                href={"/goals/" + attentionGoal.id}
                className={styles.goalNextAction}
              >
                <div>
                  <span>Next goal action</span>
                  <strong>{attentionGoal.name}</strong>
                </div>
                <div className={styles.goalNextActionMeta}>
                  <small>
                    {attention?.label ?? "Keep building"}
                  </small>
                  <ArrowRight size={14} />
                </div>
              </Link>
            )}

            {activeGoals.length > 0 ? (
              <div className={styles.goalsList}>
                {activeGoals.map((goal) => {
                  const progress = getGoalProgress(goal);
                  const current =
                    Number(goal.current_amount) || 0;
                  const target =
                    Number(goal.target_amount) || 0;
                  const remaining = Math.max(
                    target - current,
                    0
                  );

                  return (
                    <Link
                      key={goal.id}
                      href={"/goals/" + goal.id}
                      className={styles.goalRow}
                    >
                      <div className={styles.goalIcon}>
                        <Target
                          size={17}
                          strokeWidth={1.8}
                        />
                      </div>

                      <div className={styles.goalInfo}>
                        <div className={styles.goalTitleRow}>
                          <strong>{goal.name}</strong>

                          <span>
                            {progress.toFixed(0)}%
                          </span>
                        </div>

                        <div className={styles.goalTrack}>
                          <div
                            className={styles.goalBar}
                            style={{
                              width: progress + "%",
                            }}
                          />
                        </div>

                        <div className={styles.goalMeta}>
                          <span>
                            {formatCurrency(current)} saved
                          </span>

                          <span>
                            {formatCurrency(remaining)} remaining
                          </span>

                          <span>
                            <CalendarDays
                              size={11}
                              strokeWidth={1.8}
                            />
                            {getGoalDeadline(goal)}
                          </span>
                        </div>
                      </div>

                      <TrendingUp
                        className={styles.goalArrow}
                        size={15}
                        strokeWidth={1.8}
                      />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className={styles.goalsCompleted}>
                <Target size={18} strokeWidth={1.8} />

                <span>
                  All your financial goals are complete. Great work!
                </span>
              </div>
            )}
          </>
        )}
      </section>

      {/* ================================================== */}
      {/* ACCOUNT ACTIVITY + RECENT TRANSACTIONS */}
      {/* ================================================== */}

      <section
        className={
          styles.bottomGrid
        }
      >
        {/* ---------------------------------------------- */}
        {/* ACCOUNT ACTIVITY */}
        {/* ---------------------------------------------- */}

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>
                Account Activity
              </h2>

              <p>
                Accounts used recently
              </p>
            </div>

            <Link
              href="/accounts"
              className={styles.textButton}
            >
              View accounts
              <ArrowRight
                size={13}
              />
            </Link>
          </div>

          {accountActivity.length ===
          0 ? (
            <div
              className={styles.emptyState}
            >
              No account activity yet.
            </div>
          ) : (
            <div
              className={
                styles.accountList
              }
            >
              {accountActivity.map(
                ([
                  accountId,
                  account,
                ]) => (
                  <Link
                    key={accountId}
                    href={`/accounts/${accountId}`}
                    className={
                      styles.accountRow
                    }
                  >
                    <div
                      className={
                        styles.accountAvatar
                      }
                    >
                      {getAccountInitial(
                        account.name
                      )}
                    </div>

                    <div
                      className={
                        styles.accountInfo
                      }
                    >
                      <strong>
                        {account.name}
                      </strong>

                      <span>
                        {account.institution ||
                          "Personal account"}
                      </span>
                    </div>

                    <small>
                      {
                        account.transactionCount
                      }{" "}
                      transaction
                      {account.transactionCount !==
                      1
                        ? "s"
                        : ""}
                    </small>

                    <ArrowRight
                      size={14}
                    />
                  </Link>
                )
              )}
            </div>
          )}
        </article>

        {/* ---------------------------------------------- */}
        {/* RECENT TRANSACTIONS */}
        {/* ---------------------------------------------- */}

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>
                Recent Transactions
              </h2>

              <p>
                Latest money movements
              </p>
            </div>

            <Link
              href="/transactions"
              className={styles.textButton}
            >
              View all
              <ArrowRight
                size={13}
              />
            </Link>
          </div>

          {transactions.length === 0 ? (
            <div
              className={styles.emptyState}
            >
              No transactions recorded
              yet.
            </div>
          ) : (
            <div
              className={
                styles.transactionList
              }
            >
              {transactions
                .slice(0, 6)
                .map(
                  (transaction) => {
                    const isIncome =
                      transaction.transaction_type ===
                      "INCOME";

                    return (
                      <Link
                        key={
                          transaction.id
                        }
                        href={`/transactions/${transaction.id}`}
                        className={
                          styles.transactionRow
                        }
                      >
                        <div
                          className={`${styles.transactionIcon} ${
                            isIncome
                              ? styles.transactionIncome
                              : styles.transactionExpense
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight
                              size={16}
                              strokeWidth={
                                2
                              }
                            />
                          ) : (
                            <ArrowDownRight
                              size={16}
                              strokeWidth={
                                2
                              }
                            />
                          )}
                        </div>

                        <div
                          className={
                            styles.transactionInfo
                          }
                        >
                          <strong>
                            {getTransactionTitle(
                              transaction
                            )}
                          </strong>

                          <span>
                            {getTransactionCategory(
                              transaction
                            )}
                            {" · "}
                            {getTransactionAccount(
                              transaction
                            )}
                          </span>
                        </div>

                        <div
                          className={
                            styles.transactionMeta
                          }
                        >
                          <strong
                            className={
                              isIncome
                                ? styles.incomeAmount
                                : styles.expenseAmount
                            }
                          >
                            {isIncome
                              ? "+"
                              : "-"}
                            {formatCurrency(
                              transaction.amount
                            )}
                          </strong>

                          <span>
                            {formatDate(
                              transaction.transaction_date
                            )}
                          </span>
                        </div>
                      </Link>
                    );
                  }
                )}
            </div>
          )}
        </article>
      </section>

      {/* ================================================== */}
      {/* FOOTER ACTION */}
      {/* ================================================== */}

      <div
        className={
          styles.dashboardFooter
        }
      >
        <Link
          href="/analytics"
          className={
            styles.footerLink
          }
        >
          <CreditCard
            size={15}
            strokeWidth={1.8}
          />

          Review your financial
          analytics

          <ArrowRight
            size={14}
          />
        </Link>
      </div>
    </main>
  );
}