export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  IndianRupee,
  PiggyBank,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { getDashboard } from "@/lib/api/dashboard";
import { getGoals } from "@/lib/api/goalsServer";
import type {
  DashboardData,
  DashboardTransaction,
} from "@/types/dashboard";
import type { Goal } from "@/types/goal";

import styles from "./dashboard.module.scss";

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

function getMonthLabel(month: string) {
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

function getSavingsRate(
  income: number,
  expense: number
) {
  if (income <= 0) {
    return 0;
  }

  return ((income - expense) / income) * 100;
}

function buildDonutGradient(
  data: DashboardData["expenses_by_category"]
) {
  if (!data.length) {
    return "conic-gradient(#e7e1d6 0% 100%)";
  }

  const colors = [
    "#1f5a43",
    "#b28a2e",
    "#6f8f7c",
    "#a75a31",
    "#8c7458",
    "#315f52",
  ];

  let currentPercentage = 0;

  const segments = data.map((item, index) => {
    const start = currentPercentage;
    const percentage = Number(item.percentage) || 0;
    currentPercentage += percentage;

    return `${colors[index % colors.length]} ${start}% ${currentPercentage}%`;
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

export default async function DashboardPage() {
  let dashboard: DashboardData | null = null;
  let goals: Goal[] = [];
  let error = false;
  let goalsError = false;

  try {
    dashboard = await getDashboard();
  } catch (err) {
    console.error("Failed to load dashboard:", err);
    error = true;
  }

  try {
    const goalsResponse = await getGoals();
    goals = goalsResponse.items;
  } catch (err) {
    console.error("Failed to load dashboard goals:", err);
    goalsError = true;
  }

  if (error || !dashboard) {
    return (
      <main className={styles.page}>
        <section className={styles.errorCard}>
          <div className={styles.errorIcon}>
            <Wallet size={24} />
          </div>

          <div>
            <h1>Unable to load dashboard</h1>
            <p>
              Make sure the Artha FastAPI backend is running
              on port 8001.
            </p>
          </div>
        </section>
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

  const categoryTotal =
    dashboard.expenses_by_category.reduce(
      (total, item) => total + Number(item.amount),
      0
    );

  const maxCashFlowValue = getMaxCashFlowValue(
    dashboard.monthly_cash_flow
  );

  const currentMonth =
    dashboard.monthly_cash_flow.length > 0
      ? dashboard.monthly_cash_flow[
          dashboard.monthly_cash_flow.length - 1
        ]
      : null;

  const activeGoals = goals
    .filter((goal) => !goal.is_completed)
    .sort((a, b) => {
      const aTarget = Number(a.target_amount) || 0;
      const bTarget = Number(b.target_amount) || 0;
      const aProgress =
        aTarget > 0
          ? (Number(a.current_amount) || 0) / aTarget
          : 0;
      const bProgress =
        bTarget > 0
          ? (Number(b.current_amount) || 0) / bTarget
          : 0;

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

  return (
    <main className={styles.page}>
      {/* -------------------------------------------------- */}
      {/* Header */}
      {/* -------------------------------------------------- */}

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            PERSONAL FINANCE
          </p>

          <h1>Dashboard</h1>

          <p className={styles.subtitle}>
            Your financial overview at a glance.
          </p>
        </div>

        <Link
          href="/transactions/new"
          className={styles.addButton}
        >
          <span>+</span>
          Add Transaction
        </Link>
      </header>

      {/* -------------------------------------------------- */}
      {/* Summary Cards */}
      {/* -------------------------------------------------- */}

      <section className={styles.summaryGrid}>
        <article
          className={`${styles.summaryCard} ${styles.balance}`}
        >
          <div className={styles.cardTop}>
            <span>Total Balance</span>

            <div className={styles.iconWrapper}>
              <Wallet
                size={20}
                strokeWidth={1.8}
              />
            </div>
          </div>

          <strong>
            {formatCurrency(balance)}
          </strong>

          <p>Across all accounts</p>
        </article>

        <article
          className={`${styles.summaryCard} ${styles.income}`}
        >
          <div className={styles.cardTop}>
            <span>Income</span>

            <div className={styles.iconWrapper}>
              <ArrowUpRight
                size={20}
                strokeWidth={1.8}
              />
            </div>
          </div>

          <strong>
            {formatCurrency(income)}
          </strong>

          <p>This month</p>
        </article>

        <article
          className={`${styles.summaryCard} ${styles.expense}`}
        >
          <div className={styles.cardTop}>
            <span>Expenses</span>

            <div className={styles.iconWrapper}>
              <ArrowDownRight
                size={20}
                strokeWidth={1.8}
              />
            </div>
          </div>

          <strong>
            {formatCurrency(expense)}
          </strong>

          <p>This month</p>
        </article>

        <article
          className={`${styles.summaryCard} ${
            net >= 0
              ? styles.positive
              : styles.negative
          }`}
        >
          <div className={styles.cardTop}>
            <span>Net Cash Flow</span>

            <div className={styles.iconWrapper}>
              <PiggyBank
                size={20}
                strokeWidth={1.8}
              />
            </div>
          </div>

          <strong>
            {formatCurrency(net)}
          </strong>

          <p>
            {income > 0
              ? `${savingsRate.toFixed(1)}% savings rate`
              : "This month"}
          </p>
        </article>
      </section>


      {/* -------------------------------------------------- */}
      {/* Goals */}
      {/* -------------------------------------------------- */}

      {!goalsError && (
        <section className={styles.goalsCard}>
          <div className={styles.goalsHeader}>
            <div>
              <p className={styles.goalsEyebrow}>
                FINANCIAL PLANNING
              </p>

              <h2>Goals</h2>

              <p>
                {goals.length === 0
                  ? "Turn your plans into achievable financial milestones."
                  : goals.length + " " +
                    (goals.length === 1 ? "goal" : "goals") +
                    " · " +
                    completedGoals +
                    " completed"}
              </p>
            </div>

            <Link
              href="/goals"
              className={styles.goalsLink}
            >
              View all goals
              <ArrowRight size={14} />
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className={styles.goalsEmpty}>
              <div className={styles.goalsEmptyIcon}>
                <Target size={20} strokeWidth={1.8} />
              </div>

              <div>
                <strong>No financial goals yet</strong>
                <span>
                  Create a goal to start tracking your progress.
                </span>
              </div>

              <Link
                href="/goals/new"
                className={styles.createGoalLink}
              >
                Create goal
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.goalsOverview}>
                <div className={styles.goalOverviewValue}>
                  <span>Saved across goals</span>
                  <strong>{formatCurrency(totalGoalSaved)}</strong>
                </div>

                <div className={styles.goalOverviewProgress}>
                  <div className={styles.goalOverviewLabels}>
                    <span>
                      {totalGoalProgress.toFixed(0)}% of total target
                    </span>
                    <span>{formatCurrency(totalGoalTarget)}</span>
                  </div>

                  <div className={styles.goalOverviewTrack}>
                    <div
                      className={styles.goalOverviewBar}
                      style={{
                        width: totalGoalProgress + "%",
                      }}
                    />
                  </div>
                </div>
              </div>

              {activeGoals.length > 0 ? (
                <div className={styles.goalList}>
                  {activeGoals.map((goal) => {
                    const target =
                      Number(goal.target_amount) || 0;
                    const current =
                      Number(goal.current_amount) || 0;
                    const progress =
                      target > 0
                        ? Math.min(
                            Math.max((current / target) * 100, 0),
                            100
                          )
                        : 0;
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
                        <div className={styles.goalRowIcon}>
                          <Target size={17} strokeWidth={1.8} />
                        </div>

                        <div className={styles.goalRowInfo}>
                          <div className={styles.goalRowTop}>
                            <strong>{goal.name}</strong>
                            <span>{progress.toFixed(0)}%</span>
                          </div>

                          <div className={styles.goalRowTrack}>
                            <div
                              className={styles.goalRowBar}
                              style={{
                                width: progress + "%",
                              }}
                            />
                          </div>

                          <div className={styles.goalRowMeta}>
                            <span>
                              {formatCurrency(current)} saved
                            </span>
                            <span>
                              {formatCurrency(remaining)} remaining
                            </span>
                          </div>
                        </div>

                        <TrendingUp
                          className={styles.goalRowArrow}
                          size={16}
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
                    All your goals are complete. Great work!
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* -------------------------------------------------- */}
      {/* Main Analytics */}
      {/* -------------------------------------------------- */}

      <section className={styles.contentGrid}>
        {/* Expense by Category */}

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Expense by Category</h2>

              <p>This month</p>
            </div>

            <Link
              href="/analytics"
              className={styles.textButton}
            >
              Analytics
            </Link>
          </div>

          {dashboard.expenses_by_category.length ===
          0 ? (
            <div className={styles.emptyState}>
              <CreditCard size={24} />

              <strong>No expenses yet</strong>

              <span>
                Your category breakdown will appear
                here.
              </span>
            </div>
          ) : (
            <div className={styles.categoryContent}>
              <div
                className={styles.donut}
                style={{
                  background:
                    buildDonutGradient(
                      dashboard.expenses_by_category
                    ),
                }}
              >
                <div className={styles.donutInner}>
                  <strong>
                    {formatCurrency(categoryTotal)}
                  </strong>

                  <span>Total</span>
                </div>
              </div>

              <div className={styles.categoryList}>
                {dashboard.expenses_by_category.map(
                  (item, index) => (
                    <div
                      key={
                        item.category_id ??
                        `${item.category_name}-${index}`
                      }
                      className={
                        styles.categoryRow
                      }
                    >
                      <span>
                        <i
                          className={
                            styles.categoryDot
                          }
                          style={{
                            background:
                              [
                                "#1f5a43",
                                "#b28a2e",
                                "#6f8f7c",
                                "#a75a31",
                                "#8c7458",
                                "#315f52",
                              ][
                                index % 6
                              ],
                          }}
                        />

                        {item.category_name}
                      </span>

                      <strong>
                        {formatCurrency(
                          item.amount
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </article>

        {/* Monthly Cash Flow */}

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Monthly Cash Flow</h2>

              <p>
                {currentMonth
                  ? getMonthLabel(
                      currentMonth.month
                    )
                  : "No data"}
              </p>
            </div>

            <Link
              href="/analytics"
              className={styles.textButton}
            >
              Analytics
            </Link>
          </div>

          {dashboard.monthly_cash_flow.length ===
          0 ? (
            <div className={styles.emptyState}>
              <IndianRupee size={24} />

              <strong>No cash flow data</strong>

              <span>
                Add transactions to see your
                monthly cash flow.
              </span>
            </div>
          ) : (
            <div className={styles.cashFlow}>
              <div className={styles.cashFlowValue}>
                <span>Net cash flow</span>

                <strong
                  className={
                    net >= 0
                      ? styles.cashFlowPositive
                      : styles.cashFlowNegative
                  }
                >
                  {formatCurrency(net)}
                </strong>
              </div>

              <div className={styles.legend}>
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

              <div className={styles.barChart}>
                {dashboard.monthly_cash_flow.map(
                  (item) => {
                    const incomeValue =
                      Number(item.income) || 0;

                    const expenseValue =
                      Number(item.expense) || 0;

                    const incomeHeight =
                      (incomeValue /
                        maxCashFlowValue) *
                      100;

                    const expenseHeight =
                      (expenseValue /
                        maxCashFlowValue) *
                      100;

                    return (
                      <div
                        key={item.month}
                        className={
                          styles.barGroup
                        }
                      >
                        <div
                          className={
                            styles.bars
                          }
                        >
                          <div
                            className={
                              styles.barIncome
                            }
                            style={{
                              height: `${Math.max(
                                incomeHeight,
                                incomeValue > 0
                                  ? 4
                                  : 0
                              )}%`,
                            }}
                            title={`Income: ${formatCurrency(
                              incomeValue
                            )}`}
                          />

                          <div
                            className={
                              styles.barExpense
                            }
                            style={{
                              height: `${Math.max(
                                expenseHeight,
                                expenseValue > 0
                                  ? 4
                                  : 0
                              )}%`,
                            }}
                            title={`Expense: ${formatCurrency(
                              expenseValue
                            )}`}
                          />
                        </div>

                        <span>
                          {formatMonth(
                            item.month
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
      </section>

      {/* -------------------------------------------------- */}
      {/* Recent Transactions */}
      {/* -------------------------------------------------- */}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Recent Transactions</h2>

            <p>Your latest spending activity</p>
          </div>

          <Link
            href="/transactions"
            className={styles.textButton}
          >
            View all
          </Link>
        </div>

        {dashboard.recent_transactions.length ===
        0 ? (
          <div className={styles.emptyState}>
            <CreditCard size={24} />

            <strong>No transactions yet</strong>

            <span>
              Add your first transaction to start
              tracking your money.
            </span>

            <Link
              href="/transactions/new"
              className={styles.emptyButton}
            >
              Add Transaction
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className={styles.transactionList}>
            {dashboard.recent_transactions.map(
              (transaction) => {
                const isExpense =
                  transaction.transaction_type ===
                  "EXPENSE";

                const title =
                  getTransactionTitle(
                    transaction
                  );

                const category =
                  getTransactionCategory(
                    transaction
                  );

                const accountName =
                  transaction.account_name ||
                  "Account";

                const institution =
                  transaction.account_institution_name;

                return (
                  <Link
                    key={transaction.id}
                    href={`/transactions/${transaction.id}`}
                    className={
                      styles.transaction
                    }
                  >
                    <div
                      className={
                        `${styles.transactionIcon} ${
                          isExpense
                            ? styles.transactionExpenseIcon
                            : styles.transactionIncomeIcon
                        }`
                      }
                    >
                      {isExpense ? (
                        <ArrowDownRight
                          size={19}
                          strokeWidth={2}
                        />
                      ) : (
                        <ArrowUpRight
                          size={19}
                          strokeWidth={2}
                        />
                      )}
                    </div>

                    <div
                      className={
                        styles.transactionInfo
                      }
                    >
                      <strong>{title}</strong>

                      <span>
                        {category}
                        {" · "}
                        {accountName}
                        {institution
                          ? ` · ${institution}`
                          : ""}
                        {" · "}
                        {formatDate(
                          transaction.transaction_date
                        )}
                      </span>

                      {transaction.description &&
                        transaction.merchant && (
                          <small>
                            {transaction.description}
                          </small>
                        )}
                    </div>

                    <strong
                      className={
                        isExpense
                          ? styles.expenseAmount
                          : styles.incomeAmount
                      }
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(
                        transaction.amount
                      )}
                    </strong>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}