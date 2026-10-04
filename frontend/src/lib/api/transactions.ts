import { apiClient } from "./client";

import type {
  CreateTransactionPayload,
  Transaction,
  TransactionListResponse,
  UpdateTransactionPayload,
} from "@/types/transaction";

export type TransactionFilters = {
  accountId?: string;
  categoryId?: string;
  transactionType?: "INCOME" | "EXPENSE";
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function getTransactions(
  filters?: TransactionFilters
): Promise<TransactionListResponse> {
  const params = new URLSearchParams();

  if (filters?.accountId) {
    params.set(
      "account_id",
      filters.accountId
    );
  }

  if (filters?.categoryId) {
    params.set(
      "category_id",
      filters.categoryId
    );
  }

  if (filters?.transactionType) {
    params.set(
      "transaction_type",
      filters.transactionType
    );
  }

  if (filters?.startDate) {
    params.set(
      "start_date",
      filters.startDate
    );
  }

  if (filters?.endDate) {
    params.set(
      "end_date",
      filters.endDate
    );
  }

  if (filters?.search?.trim()) {
    params.set(
      "search",
      filters.search.trim()
    );
  }

  if (
    filters?.limit !== undefined
  ) {
    params.set(
      "limit",
      String(filters.limit)
    );
  }

  if (
    filters?.offset !== undefined
  ) {
    params.set(
      "offset",
      String(filters.offset)
    );
  }

  const queryString =
    params.toString();

  const endpoint = queryString
    ? `/api/v1/transactions?${queryString}`
    : "/api/v1/transactions";

  return apiClient<TransactionListResponse>(
    endpoint
  );
}

export async function getTransaction(
  transactionId: string
): Promise<Transaction> {
  return apiClient<Transaction>(
    `/api/v1/transactions/${transactionId}`
  );
}

export async function createTransaction(
  payload: CreateTransactionPayload
): Promise<Transaction> {
  return apiClient<Transaction>(
    "/api/v1/transactions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateTransaction(
  transactionId: string,
  payload: UpdateTransactionPayload
): Promise<Transaction> {
  return apiClient<Transaction>(
    `/api/v1/transactions/${transactionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteTransaction(
  transactionId: string
): Promise<void> {
  await apiClient<void>(
    `/api/v1/transactions/${transactionId}`,
    {
      method: "DELETE",
    }
  );
}