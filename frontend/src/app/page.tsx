export const dynamic = "force-dynamic";

import Link from "next/link";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  IndianRupee,
  PiggyBank,
  Receipt,
  Wallet,
} from "lucide-react";

import { getCurrentUser } from "@/lib/api/auth";
import { getDashboard } from "@/lib/api/dashboard";

import type {
  DashboardData,
  DashboardTransaction,
} from "@/types/dashboard";

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

  const topCategories =
    [...categories]
      .sort(
        (a, b) =>
          Number(b.amount) -
          Number(a.amount)
      )
      .slice(0, 5);

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

        <Link
          href="/transactions/new"
          className={styles.addButton}
        >
          + Add Transaction
        </Link>
      </header>

      {/* ================================================== */}
      {/* QUICK ACTIONS */}
      {/* ================================================== */}

      <section
        className={styles.quickActions}
        aria-label="Quick actions"
      >
        <Link
          href="/transactions/new"
          className={`${styles.quickAction} ${styles.quickActionExpense}`}
        >
          <span className={styles.quickActionIcon}>
            <ArrowDownRight
              size={18}
              strokeWidth={2}
            />
          </span>

          <span>
            <strong>
              Add Expense
            </strong>

            <small>
              Record spending
            </small>
          </span>
        </Link>

        <Link
          href="/transactions/new"
          className={`${styles.quickAction} ${styles.quickActionIncome}`}
        >
          <span className={styles.quickActionIcon}>
            <ArrowUpRight
              size={18}
              strokeWidth={2}
            />
          </span>

          <span>
            <strong>
              Add Income
            </strong>

            <small>
              Record earnings
            </small>
          </span>
        </Link>

        <Link
          href="/transactions/new"
          className={styles.quickAction}
        >
          <span className={styles.quickActionIcon}>
            <Receipt
              size={18}
              strokeWidth={1.9}
            />
          </span>

          <span>
            <strong>
              Add Transaction
            </strong>

            <small>
              Capture money movement
            </small>
          </span>
        </Link>

        <Link
          href="/accounts"
          className={styles.quickAction}
        >
          <span className={styles.quickActionIcon}>
            <Wallet
              size={18}
              strokeWidth={1.9}
            />
          </span>

          <span>
            <strong>
              Manage Accounts
            </strong>

            <small>
              View your accounts
            </small>
          </span>
        </Link>
      </section>

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