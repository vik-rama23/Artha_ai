import { apiClient } from "./client";

import type {
  CreateRecurringTransactionPayload,
  GenerateRecurringTransactionResponse,
  RecurringTransaction,
  RecurringTransactionListResponse,
  RecurringType,
  UpdateRecurringTransactionPayload,
} from "@/types/recurringTransaction";

export type RecurringTransactionFilters = {
  activeOnly?: boolean;
  recurringType?: RecurringType;
};

export async function getRecurringTransactions(
  filters?: RecurringTransactionFilters
): Promise<RecurringTransactionListResponse> {
  const params = new URLSearchParams();

  if (filters?.activeOnly !== undefined) {
    params.set(
      "active_only",
      String(filters.activeOnly)
    );
  }

  if (filters?.recurringType) {
    params.set(
      "recurring_type",
      filters.recurringType
    );
  }

  const queryString = params.toString();

  const endpoint = queryString
    ? `/api/v1/recurring-transactions?${queryString}`
    : "/api/v1/recurring-transactions";

  return apiClient<RecurringTransactionListResponse>(
    endpoint
  );
}

export async function getRecurringTransaction(
  recurringTransactionId: string
): Promise<RecurringTransaction> {
  return apiClient<RecurringTransaction>(
    `/api/v1/recurring-transactions/${recurringTransactionId}`
  );
}

export async function createRecurringTransaction(
  payload: CreateRecurringTransactionPayload
): Promise<RecurringTransaction> {
  return apiClient<RecurringTransaction>(
    "/api/v1/recurring-transactions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateRecurringTransaction(
  recurringTransactionId: string,
  payload: UpdateRecurringTransactionPayload
): Promise<RecurringTransaction> {
  return apiClient<RecurringTransaction>(
    `/api/v1/recurring-transactions/${recurringTransactionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteRecurringTransaction(
  recurringTransactionId: string
): Promise<void> {
  await apiClient<void>(
    `/api/v1/recurring-transactions/${recurringTransactionId}`,
    {
      method: "DELETE",
    }
  );
}

export async function pauseRecurringTransaction(
  recurringTransactionId: string
): Promise<RecurringTransaction> {
  return apiClient<RecurringTransaction>(
    `/api/v1/recurring-transactions/${recurringTransactionId}/pause`,
    {
      method: "POST",
    }
  );
}

export async function resumeRecurringTransaction(
  recurringTransactionId: string
): Promise<RecurringTransaction> {
  return apiClient<RecurringTransaction>(
    `/api/v1/recurring-transactions/${recurringTransactionId}/resume`,
    {
      method: "POST",
    }
  );
}

export async function generateRecurringTransaction(
  recurringTransactionId: string
): Promise<GenerateRecurringTransactionResponse> {
  return apiClient<GenerateRecurringTransactionResponse>(
    `/api/v1/recurring-transactions/${recurringTransactionId}/generate`,
    {
      method: "POST",
    }
  );
}