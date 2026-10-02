import { apiClient } from "./client";

export type BudgetStatus = "ON_TRACK" | "WARNING" | "EXCEEDED";

export type Budget = {
  id: string;
  user_id: string;
  category_id: string | null;
  category_name: string | null;
  name: string;
  month_start: string;
  month_end: string;
  amount: string;
  spent: string;
  remaining: string;
  percentage_used: string;
  warning_percentage: string;
  projected_spend: string | null;
  projected_overspend: string;
  status: BudgetStatus;
  created_at: string;
  updated_at: string;
};

export type BudgetListResponse = {
  items: Budget[];
  total: number;
};

export type CreateBudgetPayload = {
  category_id: string | null;
  name: string;
  month_start: string;
  amount: number;
  warning_percentage: number;
};

export type UpdateBudgetPayload = {
  category_id?: string | null;
  name?: string;
  month_start?: string;
  amount?: number;
  warning_percentage?: number;
};

export async function getBudgets(
  monthStart?: string,
): Promise<BudgetListResponse> {
  const query = monthStart
    ? `?month_start=${encodeURIComponent(monthStart)}`
    : "";

  return apiClient<BudgetListResponse>(`/api/v1/budgets${query}`);
}

export async function getBudget(budgetId: string): Promise<Budget> {
  return apiClient<Budget>(`/api/v1/budgets/${budgetId}`);
}

export async function createBudget(
  payload: CreateBudgetPayload,
): Promise<Budget> {
  return apiClient<Budget>("/api/v1/budgets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBudget(
  budgetId: string,
  payload: UpdateBudgetPayload,
): Promise<Budget> {
  return apiClient<Budget>(`/api/v1/budgets/${budgetId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteBudget(budgetId: string): Promise<void> {
  await apiClient<void>(`/api/v1/budgets/${budgetId}`, {
    method: "DELETE",
  });
}