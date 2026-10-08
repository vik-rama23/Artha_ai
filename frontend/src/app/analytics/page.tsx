import Link from "next/link";

import {
  getAnalyticsComparison,
  getAnalyticsInsights,
  getBudgetVsActual,
  getCategoryTrends,
  getExpensesByCategory,
  getIncomeExpenseSummary,
  getMonthlyCashFlow,
  getSavingsTrend,
  getTopTransactions,
} from "@/lib/api/analytics";

import { getCashFlowForecast } from "@/lib/api/cashFlowForecast";

import styles from "./page.module.scss";

type PeriodKey =
  | "this-month"
  | "previous-month"
  | "last-3-months"
  | "last-6-months"
  | "this-year"
  | "all-time";

type DateRange = {
  startDate: string | null;
  endDate: string | null;
  label: string;
};

function toDateString(
  date: Date
): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(
  date: Date
): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1
    )
  );
}

function endOfMonth(
  date: Date
): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      0
    )
  );
}

function getPeriod(
  period: PeriodKey
): DateRange {
  const today = new Date();

  const currentMonthStart =
    startOfMonth(today);

  const currentMonthEnd =
    endOfMonth(today);

  if (period === "this-month") {
    return {
      startDate:
        toDateString(currentMonthStart),
      endDate:
        toDateString(currentMonthEnd),
      label: "This Month",
    };
  }

  if (period === "previous-month") {
    const start = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() - 1,
        1
      )
    );

    const end = endOfMonth(start);

    return {
      startDate: toDateString(start),
      endDate: toDateString(end),
      label: "Previous Month",
    };
  }

  if (period === "last-3-months") {
    const start = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() - 2,
        1
      )
    );

    return {
      startDate: toDateString(start),
      endDate:
        toDateString(currentMonthEnd),
      label: "Last 3 Months",
    };
  }

  if (period === "last-6-months") {
    const start = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() - 5,
        1
      )
    );

    return {
      startDate: toDateString(start),
      endDate:
        toDateString(currentMonthEnd),
      label: "Last 6 Months",
    };
  }

  if (period === "this-year") {
    const start = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        0,
        1
      )
    );

    return {
      startDate: toDateString(start),
      endDate:
        toDateString(currentMonthEnd),
      label: "This Year",
    };
  }

  return {
    startDate: null,
    endDate: null,
    label: "All Time",
  };
}

function getPreviousPeriod(
  period: PeriodKey,
  currentPeriod: DateRange
): DateRange | null {
  if (
    !currentPeriod.startDate ||
    !currentPeriod.endDate
  ) {
    return null;
  }

  const currentStart = new Date(
    `${currentPeriod.startDate}T00:00:00Z`
  );

  const currentEnd = new Date(
    `${currentPeriod.endDate}T00:00:00Z`
  );

  if (period === "this-month") {
    const start = new Date(
      Date.UTC(
        currentStart.getUTCFullYear(),
        currentStart.getUTCMonth() - 1,
        1
      )
    );

    const end = endOfMonth(start);

    return {
      startDate: toDateString(start),
      endDate: toDateString(end),
      label: "Previous Month",
    };
  }

  if (period === "previous-month") {
    const start = new Date(
      Date.UTC(
        currentStart.getUTCFullYear(),
        currentStart.getUTCMonth() - 1,
        1
      )
    );

    const end = endOfMonth(start);

    return {
      startDate: toDateString(start),
      endDate: toDateString(end),
      label: "Previous Month",
    };
  }

  const currentStartMonth =
    currentStart.getUTCMonth();

  const currentStartYear =
    currentStart.getUTCFullYear();

  const currentEndMonth =
    currentEnd.getUTCMonth();

  const currentEndYear =
    currentEnd.getUTCFullYear();

  if (period === "last-3-months") {
    const start = new Date(
      Date.UTC(
        currentStartYear,
        currentStartMonth - 3,
        1
      )
    );

    const end = new Date(
      Date.UTC(
        currentEndYear,
        currentEndMonth - 3 + 1,
        0
      )
    );

    return {
      startDate: toDateString(start),
      endDate: toDateString(end),
      label: "Previous 3 Months",
    };
  }

  if (period === "last-6-months") {
    const start = new Date(
      Date.UTC(
        currentStartYear,
        currentStartMonth - 6,
        1
      )
    );

    const end = new Date(
      Date.UTC(
        currentEndYear,
        currentEndMonth - 6 + 1,
        0
      )
    );

    return {
      startDate: toDateString(start),
      endDate: toDateString(end),
      label: "Previous 6 Months",
    };
  }

  if (period === "this-year") {
    const start = new Date(
      Date.UTC(
        currentStartYear - 1,
        0,
        1
      )
    );

    const end = new Date(
      Date.UTC(
        currentStartYear - 1,
        11,
        31
      )
    );

    return {
      startDate: toDateString(start),
      endDate: toDateString(end),
      label: "Previous Year",
    };
  }

  return null;
}

function getNumericValue(
  value: number | string
): number {
  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : 0;
}

function formatCurrency(
  value: number | string
): string {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(
    getNumericValue(value)
  );
}

function formatPercentage(
  value: number | string | null
): string {
  if (value === null) {
    return "—";
  }

  const numeric =
    getNumericValue(value);

  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(
    1
  )}%`;
}

function formatMonth(
  month: string
): string {
  const date = new Date(
    `${month}-01T00:00:00Z`
  );

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }
  ).format(date);
}

function getChangeClass(
  value: number | string | null,
  inverse = false
): string {
  if (value === null) {
    return styles.changeNeutral;
  }

  const numeric =
    getNumericValue(value);

  if (numeric === 0) {
    return styles.changeNeutral;
  }

  const positive = inverse
    ? numeric < 0
    : numeric > 0;

  return positive
    ? styles.changePositive
    : styles.changeNegative;
}

function getBarHeight(
  value: number,
  maximum: number
): string {
  if (
    maximum <= 0 ||
    value <= 0
  ) {
    return "0%";
  }

  const percentage =
    (value / maximum) * 100;

  return `${Math.max(
    6,
    Math.min(100, percentage)
  )}%`;
}

function getDonutGradient(
  items: {
    percentage: number;
  }[]
): string {
  if (!items.length) {
    return "#e5dfd3 0 100%";
  }

  const stops: string[] = [];

  let current = 0;

  const donutColors = [
    "#285a45",
    "#c9973e",
    "#6f8f7e",
    "#b56b45",
    "#7c6f5b",
    "#a4b6a9",
  ];

  items.forEach(
    (item, index) => {
      const next =
        current + item.percentage;

      const color =
        donutColors[
          index % donutColors.length
        ];

      stops.push(
        `${color} ${current}% ${next}%`
      );

      current = next;
    }
  );

  if (current < 100) {
    stops.push(
      `#e5dfd3 ${current}% 100%`
    );
  }

  return `conic-gradient(${stops.join(
    ", "
  )})`;
}

function getPeriodQuery(
  period: PeriodKey
): string {
  return `?period=${period}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
  }>;
}) {
  const params =
    await searchParams;

  const requestedPeriod =
    params.period as PeriodKey;

  const validPeriods: PeriodKey[] = [
    "this-month",
    "previous-month",
    "last-3-months",
    "last-6-months",
    "this-year",
    "all-time",
  ];

  const period: PeriodKey =
    validPeriods.includes(
      requestedPeriod
    )
      ? requestedPeriod
      : "this-month";

  const currentPeriod =
    getPeriod(period);

  const previousPeriod =
    getPreviousPeriod(
      period,
      currentPeriod
    );

  const analyticsQuery = {
    startDate:
      currentPeriod.startDate ??
      undefined,
    endDate:
      currentPeriod.endDate ??
      undefined,
  };

  const [
    summary,
    expensesByCategory,
    monthlyCashFlow,
    comparison,
    categoryTrends,
    topTransactions,
    savingsTrend,
    analyticsInsights,
    forecast,
    budgetVsActual,
  ] = await Promise.all([
    getIncomeExpenseSummary(
      analyticsQuery
    ),
    getExpensesByCategory(
      analyticsQuery
    ),
    getMonthlyCashFlow(
      analyticsQuery
    ),
    previousPeriod
      ? getAnalyticsComparison({
          currentStartDate:
            currentPeriod.startDate!,
          currentEndDate:
            currentPeriod.endDate!,
          previousStartDate:
            previousPeriod.startDate!,
          previousEndDate:
            previousPeriod.endDate!,
        })
      : Promise.resolve(null),

    previousPeriod
      ? getCategoryTrends({
          currentStartDate:
            currentPeriod.startDate!,
          currentEndDate:
            currentPeriod.endDate!,
          previousStartDate:
            previousPeriod.startDate!,
          previousEndDate:
            previousPeriod.endDate!,
        })
      : Promise.resolve(null),

    getTopTransactions({
      ...analyticsQuery,
      limit: 5,
    }),
    getSavingsTrend(analyticsQuery),
    getAnalyticsInsights(analyticsQuery),
    getCashFlowForecast(),
    getBudgetVsActual(),
  ]);

  const income =
    getNumericValue(summary.income);

  const expense =
    getNumericValue(summary.expense);

  const net =
    getNumericValue(summary.net);

  const savingsRate =
    income > 0
      ? (net / income) * 100
      : 0;

  const monthlyItems =
    monthlyCashFlow.items;

  const maximumMonthlyValue =
    Math.max(
      0,
      ...monthlyItems.flatMap(
        (item) => [
          getNumericValue(
            item.income
          ),
          getNumericValue(
            item.expense
          ),
        ]
      )
    );

  const categoryItems =
    expensesByCategory.items.map(
      (item) => ({
        ...item,
        numericAmount:
          getNumericValue(
            item.amount
          ),
        numericPercentage:
          getNumericValue(
            item.percentage
          ),
      })
    );

  const donutGradient =
    getDonutGradient(
      categoryItems.map(
        (item) => ({
          percentage:
            item.numericPercentage,
        })
      )
    );

  const comparisonIncome =
    comparison?.income;

  const comparisonExpense =
    comparison?.expense;

  const comparisonNet =
    comparison?.net;

  const topTransactionItems =
    topTransactions.items;

  const categoryTrendItems =
    categoryTrends?.items ?? [];

  const savingsTrendItems =
    savingsTrend.items;

  const insightItems =
    analyticsInsights.insights;

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              ANALYTICS
            </p>

            <h1>
              Understand your money
            </h1>

            <p
              className={
                styles.subtitle
              }
            >
              Track your cash flow,
              spending patterns and
              financial progress.
            </p>
          </div>

          <div
            className={
              styles.periodControl
            }
          >
            <span>
              Period
            </span>

            <strong>
              {currentPeriod.label}
            </strong>
          </div>
        </header>

        <nav
          className={
            styles.periodNavigation
          }
          aria-label="Analytics period"
        >
          <Link
            href={getPeriodQuery(
              "this-month"
            )}
            className={
              period ===
              "this-month"
                ? styles.periodActive
                : styles.periodLink
            }
          >
            This Month
          </Link>

          <Link
            href={getPeriodQuery(
              "previous-month"
            )}
            className={
              period ===
              "previous-month"
                ? styles.periodActive
                : styles.periodLink
            }
          >
            Previous Month
          </Link>

          <Link
            href={getPeriodQuery(
              "last-3-months"
            )}
            className={
              period ===
              "last-3-months"
                ? styles.periodActive
                : styles.periodLink
            }
          >
            Last 3 Months
          </Link>

          <Link
            href={getPeriodQuery(
              "last-6-months"
            )}
            className={
              period ===
              "last-6-months"
                ? styles.periodActive
                : styles.periodLink
            }
          >
            Last 6 Months
          </Link>

          <Link
            href={getPeriodQuery(
              "this-year"
            )}
            className={
              period ===
              "this-year"
                ? styles.periodActive
                : styles.periodLink
            }
          >
            This Year
          </Link>

          <Link
            href={getPeriodQuery(
              "all-time"
            )}
            className={
              period ===
              "all-time"
                ? styles.periodActive
                : styles.periodLink
            }
          >
            All Time
          </Link>
        </nav>

        <section className={styles.budgetActualSection}>
          <div className={styles.budgetActualHeader}>
            <div>
              <p className={styles.eyebrow}>BUDGET PERFORMANCE</p>
              <h2>Budget vs Actual</h2>
              <p>See where your planned spending stands against actual and projected spending.</p>
            </div>
            <Link href="/budgets" className={styles.budgetActualLink}>
              Manage budgets
            </Link>
          </div>

          {budgetVsActual.items.length === 0 ? (
            <div className={styles.budgetActualEmpty}>
              No budgets are configured for this month yet.
            </div>
          ) : (
            <>
              <div className={styles.budgetActualMetrics}>
                <div><span>Budget</span><strong>{formatCurrency(budgetVsActual.total_budget)}</strong></div>
                <div><span>Actual</span><strong>{formatCurrency(budgetVsActual.total_actual)}</strong></div>
                <div><span>Projected</span><strong>{formatCurrency(budgetVsActual.total_projected)}</strong></div>
                <div>
                  <span>Projected variance</span>
                  <strong className={getNumericValue(budgetVsActual.total_projected_variance) < 0 ? styles.budgetVarianceNegative : styles.budgetVariancePositive}>
                    {formatCurrency(budgetVsActual.total_projected_variance)}
                  </strong>
                </div>
              </div>

              <div className={styles.budgetActualList}>
                {budgetVsActual.items.map((item) => {
                  const used = Math.min(Math.max(getNumericValue(item.percentage_used), 0), 100);

                  return (
                    <div className={styles.budgetActualRow} key={item.budget_id}>
                      <div className={styles.budgetActualName}>
                        <strong>{item.category_name}</strong>
                        <span>{formatCurrency(item.actual_amount)} / {formatCurrency(item.budget_amount)}</span>
                      </div>

                      <div className={styles.budgetActualTrack}>
                        <div
                          className={`${styles.budgetActualBar} ${
                            item.status === "EXCEEDED"
                              ? styles.budgetActualBarDanger
                              : item.status === "WARNING"
                                ? styles.budgetActualBarWarning
                                : styles.budgetActualBarGood
                          }`}
                          style={{ width: used + "%" }}
                        />
                      </div>

                      <div className={styles.budgetActualMeta}>
                        <span>{used.toFixed(0)}% used</span>
                        <strong>{item.projected_amount ? formatCurrency(item.projected_amount) : "—"}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
        <section
          className={
            styles.summaryGrid
          }
        >
          <article
            className={styles.summaryCard}
          >
            <div
              className={
                styles.cardLabel
              }
            >
              <span>Income</span>
              <span
                className={
                  styles.cardIconIncome
                }
              >
                ↑
              </span>
            </div>

            <strong>
              {formatCurrency(
                income
              )}
            </strong>

            {comparisonIncome && (
              <div
                className={getChangeClass(
                  comparisonIncome.change_percentage
                )}
              >
                {formatPercentage(
                  comparisonIncome.change_percentage
                )}{" "}
                vs previous period
              </div>
            )}
          </article>

          <article
            className={styles.summaryCard}
          >
            <div
              className={
                styles.cardLabel
              }
            >
              <span>Expenses</span>
              <span
                className={
                  styles.cardIconExpense
                }
              >
                ↓
              </span>
            </div>

            <strong>
              {formatCurrency(
                expense
              )}
            </strong>

            {comparisonExpense && (
              <div
                className={getChangeClass(
                  comparisonExpense.change_percentage,
                  true
                )}
              >
                {formatPercentage(
                  comparisonExpense.change_percentage
                )}{" "}
                vs previous period
              </div>
            )}
          </article>

          <article
            className={styles.summaryCard}
          >
            <div
              className={
                styles.cardLabel
              }
            >
              <span>
                Net Cash Flow
              </span>

              <span
                className={
                  styles.cardIconNet
                }
              >
                ₹
              </span>
            </div>

            <strong>
              {formatCurrency(net)}
            </strong>

            {comparisonNet && (
              <div
                className={getChangeClass(
                  comparisonNet.change_percentage
                )}
              >
                {formatPercentage(
                  comparisonNet.change_percentage
                )}{" "}
                vs previous period
              </div>
            )}
          </article>

          <article
            className={
              styles.summaryCard
            }
          >
            <div
              className={
                styles.cardLabel
              }
            >
              <span>
                Savings Rate
              </span>

              <span
                className={
                  styles.cardIconSavings
                }
              >
                %
              </span>
            </div>

            <strong>
              {savingsRate.toFixed(1)}%
            </strong>

            <div
              className={
                savingsRate >= 0
                  ? styles.changePositive
                  : styles.changeNegative
              }
            >
              {formatCurrency(net)} retained
            </div>
          </article>
        </section>

        <section
          className={
            styles.twoColumn
          }
        >
          <article
            className={`${styles.card} ${styles.cashFlowCard}`}
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <h2>
                  Income vs Expenses
                </h2>

                <p>
                  Monthly cash flow
                  during the selected
                  period.
                </p>
              </div>

              <div
                className={
                  styles.legend
                }
              >
                <span>
                  <i
                    className={
                      styles.incomeDot
                    }
                  />
                  Income
                </span>

                <span>
                  <i
                    className={
                      styles.expenseDot
                    }
                  />
                  Expenses
                </span>
              </div>
            </div>

            {monthlyItems.length ===
            0 ? (
              <div
                className={
                  styles.emptyState
                }
              >
                No monthly transaction
                data for this period.
              </div>
            ) : (
              <div
                className={
                  styles.chart
                }
              >
                {monthlyItems.map(
                  (item) => {
                    const monthlyIncome =
                      getNumericValue(
                        item.income
                      );

                    const monthlyExpense =
                      getNumericValue(
                        item.expense
                      );

                    return (
                      <div
                        className={
                          styles.chartColumn
                        }
                        key={
                          item.month
                        }
                      >
                        <div
                          className={
                            styles.chartValues
                          }
                        >
                          <span>
                            {formatCurrency(
                              monthlyIncome
                            )}
                          </span>

                          <span>
                            {formatCurrency(
                              monthlyExpense
                            )}
                          </span>
                        </div>

                        <div
                          className={
                            styles.bars
                          }
                        >
                          <div
                            className={
                              styles.incomeBar
                            }
                            style={{
                              height:
                                getBarHeight(
                                  monthlyIncome,
                                  maximumMonthlyValue
                                ),
                            }}
                          />

                          <div
                            className={
                              styles.expenseBar
                            }
                            style={{
                              height:
                                getBarHeight(
                                  monthlyExpense,
                                  maximumMonthlyValue
                                ),
                            }}
                          />
                        </div>

                        <span
                          className={
                            styles.chartLabel
                          }
                        >
                          {formatMonth(
                            item.month
                          )}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </article>

          <article
            className={`${styles.card} ${styles.categoryCard}`}
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <h2>
                  Expense Breakdown
                </h2>

                <p>
                  Where your money went.
                </p>
              </div>

              <strong
                className={
                  styles.totalExpense
                }
              >
                {formatCurrency(
                  expense
                )}
              </strong>
            </div>

            {categoryItems.length ===
            0 ? (
              <div
                className={
                  styles.emptyState
                }
              >
                No expense data for
                this period.
              </div>
            ) : (
              <>
                <div
                  className={
                    styles.donutArea
                  }
                >
                  <div
                    className={
                      styles.donut
                    }
                    style={{
                      background:
                        donutGradient,
                    }}
                  >
                    <div
                      className={
                        styles.donutCenter
                      }
                    >
                      <strong>
                        {formatCurrency(
                          expense
                        )}
                      </strong>

                      <span>
                        Total
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={
                    styles.categoryList
                  }
                >
                  {categoryItems
                    .slice(0, 6)
                    .map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          className={
                            styles.categoryRow
                          }
                          key={`${item.category_id ?? "uncategorized"}-${item.category_name}`}
                        >
                          <div
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
                                  [
                                    "#285a45",
                                    "#c9973e",
                                    "#6f8f7e",
                                    "#b56b45",
                                    "#7c6f5b",
                                    "#a4b6a9",
                                  ][
                                    index %
                                      6
                                  ],
                              }}
                            />

                            <span>
                              {
                                item.category_name
                              }
                            </span>
                          </div>

                          <div
                            className={
                              styles.categoryAmount
                            }
                          >
                            <strong>
                              {formatCurrency(
                                item.numericAmount
                              )}
                            </strong>

                            <span>
                              {item.numericPercentage.toFixed(
                                1
                              )}
                              %
                            </span>
                          </div>
                        </div>
                      )
                    )}
                </div>
              </>
            )}
          </article>
        </section>

        <section
          className={
            styles.twoColumn
          }
        >
          <article
            className={styles.card}
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <h2>
                  Period Comparison
                </h2>

                <p>
                  Current period compared
                  with the previous
                  period.
                </p>
              </div>
            </div>

            {!comparison ? (
              <div
                className={
                  styles.emptyState
                }
              >
                Comparison is not available
                for All Time yet.
              </div>
            ) : (
              <div
                className={
                  styles.comparisonList
                }
              >
                <div
                  className={
                    styles.comparisonHeader
                  }
                >
                  <span>
                    Metric
                  </span>

                  <span>
                    Current
                  </span>

                  <span>
                    Previous
                  </span>

                  <span>
                    Change
                  </span>
                </div>

                <div
                  className={
                    styles.comparisonRow
                  }
                >
                  <strong>
                    Income
                  </strong>

                  <span>
                    {formatCurrency(
                      comparisonIncome?.current ??
                        0
                    )}
                  </span>

                  <span>
                    {formatCurrency(
                      comparisonIncome?.previous ??
                        0
                    )}
                  </span>

                  <span
                    className={getChangeClass(
                      comparisonIncome?.change_percentage ??
                        null
                    )}
                  >
                    {formatPercentage(
                      comparisonIncome?.change_percentage ??
                        null
                    )}
                  </span>
                </div>

                <div
                  className={
                    styles.comparisonRow
                  }
                >
                  <strong>
                    Expenses
                  </strong>

                  <span>
                    {formatCurrency(
                      comparisonExpense?.current ??
                        0
                    )}
                  </span>

                  <span>
                    {formatCurrency(
                      comparisonExpense?.previous ??
                        0
                    )}
                  </span>

                  <span
                    className={getChangeClass(
                      comparisonExpense?.change_percentage ??
                        null,
                      true
                    )}
                  >
                    {formatPercentage(
                      comparisonExpense?.change_percentage ??
                        null
                    )}
                  </span>
                </div>

                <div
                  className={
                    styles.comparisonRow
                  }
                >
                  <strong>
                    Net Cash Flow
                  </strong>

                  <span>
                    {formatCurrency(
                      comparisonNet?.current ??
                        0
                    )}
                  </span>

                  <span>
                    {formatCurrency(
                      comparisonNet?.previous ??
                        0
                    )}
                  </span>

                  <span
                    className={getChangeClass(
                      comparisonNet?.change_percentage ??
                        null
                    )}
                  >
                    {formatPercentage(
                      comparisonNet?.change_percentage ??
                        null
                    )}
                  </span>
                </div>
              </div>
            )}
          </article>

          <article
            className={styles.card}
          >
            <div
              className={
                styles.cardHeader
              }
            >
              <div>
                <h2>
                  Financial Insights
                </h2>

                <p>
                  Highlights generated from your selected period.
                </p>
              </div>
            </div>

            {insightItems.length === 0 ? (
              <div className={styles.emptyState}>
                No financial insights are available for this period.
              </div>
            ) : (
              <div
                className={
                  styles.insightList
                }
              >
                {insightItems.slice(0, 6).map(
                  (insight, index) => (
                    <div
                      className={
                        styles.insight
                      }
                      key={`${insight.type}-${index}`}
                    >
                      <span
                        className={
                          styles.insightNumber
                        }
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div>
                        <strong>
                          {insight.title}
                        </strong>

                        <p>
                          {insight.message}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </article>
        </section>

        <section
          className={styles.card}
        >
          <div
            className={
              styles.cardHeader
            }
          >
            <div>
              <h2>
                Savings Trend
              </h2>

              <p>
                Monthly savings and savings rate during the selected period.
              </p>
            </div>

            <div className={styles.savingsTrendSummary}>
              <strong className={styles.totalExpense}>
                {formatCurrency(savingsTrend.total_savings)}
              </strong>

              <span>
                {getNumericValue(
                  savingsTrend.average_savings_rate
                ).toFixed(1)}% average savings rate
              </span>
            </div>
          </div>

          {savingsTrendItems.length === 0 ? (
            <div className={styles.emptyState}>
              No savings trend data is available for this period.
            </div>
          ) : (
            <div className={styles.trendList}>
              <div className={styles.trendHeader}>
                <span>Month</span>
                <span>Income</span>
                <span>Expenses</span>
                <span>Savings</span>
              </div>

              {savingsTrendItems.map((item) => {
                const itemSavings = getNumericValue(item.savings);
                const itemSavingsRate = getNumericValue(
                  item.savings_rate
                );

                return (
                  <div
                    className={styles.trendRow}
                    key={item.month}
                  >
                    <div>
                      <strong>
                        {formatMonth(item.month)}
                      </strong>
                      <span>
                        {itemSavingsRate.toFixed(1)}% savings rate
                      </span>
                    </div>

                    <span>
                      {formatCurrency(item.income)}
                    </span>

                    <span>
                      {formatCurrency(item.expense)}
                    </span>

                    <span
                      className={
                        itemSavings >= 0
                          ? styles.changePositive
                          : styles.changeNegative
                      }
                    >
                      {formatCurrency(itemSavings)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          className={styles.twoColumn}
        >
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>
                  Category Trends
                </h2>

                <p>
                  Current spending compared with the previous period.
                </p>
              </div>
            </div>

            {!categoryTrends ? (
              <div className={styles.emptyState}>
                Category trend comparison is not available for All Time.
              </div>
            ) : categoryTrendItems.length === 0 ? (
              <div className={styles.emptyState}>
                No category trend data available.
              </div>
            ) : (
              <div className={styles.trendList}>
                <div className={styles.trendHeader}>
                  <span>Category</span>
                  <span>Current</span>
                  <span>Previous</span>
                  <span>Change</span>
                </div>

                {categoryTrendItems.slice(0, 8).map((item) => {
                  const currentAmount = getNumericValue(
                    item.current_amount
                  );

                  const previousAmount = getNumericValue(
                    item.previous_amount
                  );

                  const changePercentage =
                    previousAmount === 0
                      ? currentAmount === 0
                        ? 0
                        : null
                      : ((currentAmount - previousAmount) /
                          previousAmount) *
                        100;

                  return (
                    <div
                      key={`${item.category_id ?? "uncategorized"}-${item.category_name}`}
                      className={styles.trendRow}
                    >
                      <div>
                        <strong>{item.category_name}</strong>
                        <span>
                          {getNumericValue(
                            item.current_percentage
                          ).toFixed(1)}
                          % of current expenses
                        </span>
                      </div>

                      <span>
                        {formatCurrency(item.current_amount)}
                      </span>

                      <span>
                        {formatCurrency(item.previous_amount)}
                      </span>

                      <span
                        className={getChangeClass(
                          changePercentage,
                          true
                        )}
                      >
                        {formatPercentage(changePercentage)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>
                  Largest Transactions
                </h2>

                <p>
                  Your biggest expenses during the selected period.
                </p>
              </div>

              <strong className={styles.totalExpense}>
                {formatCurrency(topTransactions.total_expense)}
              </strong>
            </div>

            {topTransactionItems.length === 0 ? (
              <div className={styles.emptyState}>
                No expense transactions for this period.
              </div>
            ) : (
              <div className={styles.topTransactionList}>
                {topTransactionItems.map((transaction, index) => {
                  const title =
                    transaction.merchant?.trim() ||
                    transaction.description?.trim() ||
                    transaction.category_name;

                  return (
                    <Link
                      key={transaction.transaction_id}
                      href={`/transactions/${transaction.transaction_id}`}
                      className={styles.topTransaction}
                    >
                      <span className={styles.topTransactionRank}>
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className={styles.topTransactionInfo}>
                        <strong>{title}</strong>

                        <span>
                          {transaction.category_name}
                          {" · "}
                          {transaction.account_name}
                          {" · "}
                          {new Intl.DateTimeFormat("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            timeZone: "UTC",
                          }).format(
                            new Date(
                              `${transaction.transaction_date}T00:00:00Z`
                            )
                          )}
                        </span>

                        {transaction.description &&
                          transaction.merchant && (
                            <small>
                              {transaction.description}
                            </small>
                          )}
                      </div>

                      <strong className={styles.topTransactionAmount}>
                        -{formatCurrency(transaction.amount)}
                      </strong>
                    </Link>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section className={styles.forecastSection}>
          <div className={styles.forecastHeader}>
            <div>
              <p className={styles.forecastEyebrow}>FORECAST</p>
              <h2>Cash Flow Forecast</h2>
              <span>Projected position for the rest of this month.</span>
            </div>

            <span
              className={`${styles.forecastStatus} ${styles[`forecastStatus${forecast.status}`]}`}
            >
              {forecast.status === "HEALTHY"
                ? "Healthy"
                : forecast.status === "WATCH"
                  ? "Watch"
                  : "At Risk"}
            </span>
          </div>

          <div className={styles.forecastMain}>
            <div className={styles.forecastBalance}>
              <span>Projected month-end balance</span>
              <strong>
                {formatCurrency(
                  forecast.projected_month_end_balance
                )}
              </strong>
              <small>
                {forecast.days_remaining === 0
                  ? "Month ends today"
                  : `${forecast.days_remaining} days remaining`}
              </small>
            </div>

            <div className={styles.forecastMetrics}>
              <div>
                <span>Current balance</span>
                <strong>{formatCurrency(forecast.current_balance)}</strong>
              </div>

              <div>
                <span>Expected income</span>
                <strong>{formatCurrency(forecast.expected_recurring_income)}</strong>
              </div>

              <div>
                <span>Expected expenses</span>
                <strong>{formatCurrency(forecast.projected_expense)}</strong>
              </div>

              <div>
                <span>Variable spend / day</span>
                <strong>{formatCurrency(forecast.average_daily_variable_expense)}</strong>
              </div>
            </div>
          </div>

          <div className={styles.forecastInsight}>
            <strong>Artha insight</strong>
            <span>{forecast.insight}</span>
          </div>

          <div className={styles.forecastCommitments}>
            <div className={styles.forecastCommitmentsHeader}>
              <div>
                <h3>Upcoming recurring commitments</h3>
                <p>Scheduled income and expenses expected before month end.</p>
              </div>
              <span>{forecast.upcoming_items.length} items</span>
            </div>

            {forecast.upcoming_items.length === 0 ? (
              <div className={styles.forecastEmpty}>
                No recurring commitments are scheduled for the rest of this month.
              </div>
            ) : (
              <div className={styles.forecastItemList}>
                {forecast.upcoming_items.map((item) => (
                  <div
                    className={styles.forecastItem}
                    key={`${item.recurring_transaction_id}-${item.occurrence_date}`}
                  >
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {new Intl.DateTimeFormat("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(
                          new Date(`${item.occurrence_date}T00:00:00Z`)
                        )}
                        {" · "}
                        {item.frequency}
                      </span>
                    </div>

                    <strong
                      className={
                        item.transaction_type === "INCOME"
                          ? styles.forecastIncome
                          : styles.forecastExpense
                      }
                    >
                      {item.transaction_type === "INCOME" ? "+" : "-"}
                      {formatCurrency(item.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          className={
            styles.card
          }
        >
          <div
            className={
              styles.cardHeader
            }
          >
            <div>
              <h2>
                Monthly Performance
              </h2>

              <p>
                Income, expenses and net
                cash flow by month.
              </p>
            </div>
          </div>

          {monthlyItems.length ===
          0 ? (
            <div
              className={
                styles.emptyState
              }
            >
              No monthly performance
              data available.
            </div>
          ) : (
            <div
              className={
                styles.tableWrapper
              }
            >
              <table
                className={
                  styles.table
                }
              >
                <thead>
                  <tr>
                    <th>
                      Month
                    </th>

                    <th>
                      Income
                    </th>

                    <th>
                      Expenses
                    </th>

                    <th>
                      Net Cash Flow
                    </th>

                    <th>
                      Savings Rate
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {monthlyItems.map(
                    (item) => {
                      const rowIncome =
                        getNumericValue(
                          item.income
                        );

                      const rowExpense =
                        getNumericValue(
                          item.expense
                        );

                      const rowNet =
                        getNumericValue(
                          item.net
                        );

                      const rowSavings =
                        rowIncome > 0
                          ? (rowNet /
                              rowIncome) *
                            100
                          : 0;

                      return (
                        <tr
                          key={
                            item.month
                          }
                        >
                          <td>
                            <strong>
                              {formatMonth(
                                item.month
                              )}
                            </strong>
                          </td>

                          <td>
                            {formatCurrency(
                              rowIncome
                            )}
                          </td>

                          <td>
                            {formatCurrency(
                              rowExpense
                            )}
                          </td>

                          <td
                            className={
                              rowNet >=
                              0
                                ? styles.netPositive
                                : styles.netNegative
                            }
                          >
                            {formatCurrency(
                              rowNet
                            )}
                          </td>

                          <td>
                            {rowSavings.toFixed(
                              1
                            )}
                            %
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div
          className={
            styles.footerNote
          }
        >
          <span>
            Artha Analytics
          </span>

          <span>
            Calculated from your
            transaction data
          </span>
        </div>
      </div>
    </main>
  );
}