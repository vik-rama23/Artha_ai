import { serverApiClient } from "./serverClient";

import type {
  AnalyticsComparisonResponse,
  AnalyticsInsightsResponse,
  CategoryTrendsResponse,
  ExpenseByCategoryResponse,
  IncomeExpenseSummary,
  MonthlyCashFlowResponse,
  SavingsTrendResponse,
  TopTransactionsResponse,
} from "@/types/analytics";

type AnalyticsQuery = {
  startDate?: string;
  endDate?: string;
};

type ComparisonQuery = {
  currentStartDate: string;
  currentEndDate: string;
  previousStartDate: string;
  previousEndDate: string;
};

type TopTransactionsQuery = AnalyticsQuery & {
  limit?: number;
};

function buildQuery(query: AnalyticsQuery): string {
  const params = new URLSearchParams();

  if (query.startDate) {
    params.set("start_date", query.startDate);
  }

  if (query.endDate) {
    params.set("end_date", query.endDate);
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

function buildComparisonQuery(
  query: ComparisonQuery
): string {
  const params = new URLSearchParams();

  params.set(
    "current_start_date",
    query.currentStartDate
  );

  params.set(
    "current_end_date",
    query.currentEndDate
  );

  params.set(
    "previous_start_date",
    query.previousStartDate
  );

  params.set(
    "previous_end_date",
    query.previousEndDate
  );

  return `?${params.toString()}`;
}

function buildTopTransactionsQuery(
  query: TopTransactionsQuery
): string {
  const params = new URLSearchParams();

  if (query.startDate) {
    params.set(
      "start_date",
      query.startDate
    );
  }

  if (query.endDate) {
    params.set(
      "end_date",
      query.endDate
    );
  }

  if (query.limit !== undefined) {
    params.set(
      "limit",
      String(query.limit)
    );
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export async function getIncomeExpenseSummary(
  query: AnalyticsQuery = {}
): Promise<IncomeExpenseSummary> {
  return serverApiClient<IncomeExpenseSummary>(
    `/api/v1/analytics/summary${buildQuery(query)}`
  );
}

export async function getExpensesByCategory(
  query: AnalyticsQuery = {}
): Promise<ExpenseByCategoryResponse> {
  return serverApiClient<ExpenseByCategoryResponse>(
    `/api/v1/analytics/expenses-by-category${buildQuery(
      query
    )}`
  );
}

export async function getMonthlyCashFlow(
  query: AnalyticsQuery = {}
): Promise<MonthlyCashFlowResponse> {
  return serverApiClient<MonthlyCashFlowResponse>(
    `/api/v1/analytics/monthly${buildQuery(query)}`
  );
}

export async function getAnalyticsComparison(
  query: ComparisonQuery
): Promise<AnalyticsComparisonResponse> {
  return serverApiClient<AnalyticsComparisonResponse>(
    `/api/v1/analytics/comparison${buildComparisonQuery(
      query
    )}`
  );
}

export async function getCategoryTrends(
  query: ComparisonQuery
): Promise<CategoryTrendsResponse> {
  return serverApiClient<CategoryTrendsResponse>(
    `/api/v1/analytics/category-trends${buildComparisonQuery(
      query
    )}`
  );
}

export async function getTopTransactions(
  query: TopTransactionsQuery = {}
): Promise<TopTransactionsResponse> {
  return serverApiClient<TopTransactionsResponse>(
    `/api/v1/analytics/top-transactions${buildTopTransactionsQuery(
      query
    )}`
  );
}

export async function getSavingsTrend(
  query: AnalyticsQuery = {}
): Promise<SavingsTrendResponse> {
  return serverApiClient<SavingsTrendResponse>(
    `/api/v1/analytics/savings-trend${buildQuery(query)}`
  );
}

export async function getAnalyticsInsights(
  query: AnalyticsQuery = {}
): Promise<AnalyticsInsightsResponse> {
  return serverApiClient<AnalyticsInsightsResponse>(
    `/api/v1/analytics/insights${buildQuery(query)}`
  );
}


export type BudgetVsActualItem = {
  budget_id: string;
  category_id: string | null;
  category_name: string;
  budget_amount: string;
  actual_amount: string;
  variance: string;
  percentage_used: string;
  projected_amount: string | null;
  projected_variance: string;
  status: "ON_TRACK" | "WARNING" | "EXCEEDED";
};

export type BudgetVsActualResponse = {
  month_start: string;
  month_end: string;
  total_budget: string;
  total_actual: string;
  total_variance: string;
  total_projected: string;
  total_projected_variance: string;
  items: BudgetVsActualItem[];
};

export async function getBudgetVsActual(
  monthStart?: string
): Promise<BudgetVsActualResponse> {
  const query = monthStart
    ? `?month_start=${encodeURIComponent(monthStart)}`
    : "";

  return serverApiClient<BudgetVsActualResponse>(
    `/api/v1/analytics/budget-vs-actual${query}`
  );
}
