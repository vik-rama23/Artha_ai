export type NumericValue = number | string;

export type IncomeExpenseSummary = {
  user_id: string;
  start_date: string | null;
  end_date: string | null;
  income: NumericValue;
  expense: NumericValue;
  net: NumericValue;
};

export type ExpenseByCategoryItem = {
  category_id: string | null;
  category_name: string;
  amount: NumericValue;
  percentage: NumericValue;
};

export type ExpenseByCategoryResponse = {
  start_date: string | null;
  end_date: string | null;
  total_expense: NumericValue;
  items: ExpenseByCategoryItem[];
};

export type MonthlyCashFlowItem = {
  month: string;
  income: NumericValue;
  expense: NumericValue;
  net: NumericValue;
};

export type MonthlyCashFlowResponse = {
  start_date: string | null;
  end_date: string | null;
  items: MonthlyCashFlowItem[];
};

export type AnalyticsPeriod = {
  start_date: string;
  end_date: string;
  income: NumericValue;
  expense: NumericValue;
  net: NumericValue;
};

export type AnalyticsMetricChange = {
  current: NumericValue;
  previous: NumericValue;
  change: NumericValue;
  change_percentage: NumericValue | null;
};

export type AnalyticsComparisonResponse = {
  current_period: AnalyticsPeriod;
  previous_period: AnalyticsPeriod;
  income: AnalyticsMetricChange;
  expense: AnalyticsMetricChange;
  net: AnalyticsMetricChange;
};

export type CategoryTrendItem = {
  category_id: string | null;
  category_name: string;
  current_amount: NumericValue;
  previous_amount: NumericValue;
  change: NumericValue;
  change_percentage: NumericValue | null;
  current_percentage: NumericValue;
};

export type CategoryTrendsResponse = {
  current_period_start_date: string;
  current_period_end_date: string;
  previous_period_start_date: string;
  previous_period_end_date: string;
  total_current_expense: NumericValue;
  total_previous_expense: NumericValue;
  items: CategoryTrendItem[];
};

export type TopTransactionItem = {
  transaction_id: string;
  transaction_date: string;
  amount: NumericValue;
  merchant: string | null;
  description: string | null;
  category_id: string | null;
  category_name: string;
  account_id: string;
  account_name: string;
};

export type TopTransactionsResponse = {
  start_date: string | null;
  end_date: string | null;
  limit: number;
  total_expense: NumericValue;
  items: TopTransactionItem[];
};

export type SavingsTrendItem = {
  month: string;
  income: NumericValue;
  expense: NumericValue;
  savings: NumericValue;
  savings_rate: NumericValue;
};

export type SavingsTrendResponse = {
  start_date: string | null;
  end_date: string | null;
  total_income: NumericValue;
  total_expense: NumericValue;
  total_savings: NumericValue;
  average_savings_rate: NumericValue;
  items: SavingsTrendItem[];
};

export type AnalyticsInsight = {
  type: string;
  title: string;
  message: string;
  value: NumericValue;
  percentage: NumericValue | null;
};

export type AnalyticsInsightsResponse = {
  start_date: string | null;
  end_date: string | null;
  income: NumericValue;
  expense: NumericValue;
  savings: NumericValue;
  savings_rate: NumericValue;
  insights: AnalyticsInsight[];
};

export type AnalyticsData = {
  summary: IncomeExpenseSummary;
  expensesByCategory: ExpenseByCategoryResponse;
  monthlyCashFlow: MonthlyCashFlowResponse;
  comparison: AnalyticsComparisonResponse | null;
  categoryTrends: CategoryTrendsResponse | null;
  topTransactions: TopTransactionsResponse;
  savingsTrend: SavingsTrendResponse | null;
  insights: AnalyticsInsightsResponse | null;
};
