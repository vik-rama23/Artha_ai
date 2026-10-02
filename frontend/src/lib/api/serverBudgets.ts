import { serverApiClient } from "./serverClient";
import type {
  Budget,
  BudgetListResponse,
  CreateBudgetPayload,
  UpdateBudgetPayload,
} from "./budgets";

export async function getServerBudgets(
  monthStart?: string,
): Promise<BudgetListResponse> {
  const query = monthStart
    ? `?month_start=${encodeURIComponent(monthStart)}`
    : "";

  return serverApiClient<BudgetListResponse>(
    `/api/v1/budgets${query}`,
  );
}

export async function getServerBudget(
  budgetId: string,
): Promise<Budget> {
  return serverApiClient<Budget>(
    `/api/v1/budgets/${budgetId}`,
  );
}

export async function createServerBudget(
  payload: CreateBudgetPayload,
): Promise<Budget> {
  return serverApiClient<Budget>("/api/v1/budgets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateServerBudget(
  budgetId: string,
  payload: UpdateBudgetPayload,
): Promise<Budget> {
  return serverApiClient<Budget>(
    `/api/v1/budgets/${budgetId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteServerBudget(
  budgetId: string,
): Promise<void> {
  await serverApiClient<void>(
    `/api/v1/budgets/${budgetId}`,
    {
      method: "DELETE",
    },
  );
}