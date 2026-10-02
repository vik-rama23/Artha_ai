import { apiClient } from "./client";

import type {
  CreateTransactionPayload,
  Transaction,
  TransactionListResponse,
  UpdateTransactionPayload,
} from "@/types/transaction";

export type TransactionFilters = {
  accountId?: string;
  transactionType?: "INCOME" | "EXPENSE";
  startDate?: string;
  endDate?: string;
};

export async function getTransactions(
  filters?: TransactionFilters
): Promise<TransactionListResponse> {
  const params =
    new URLSearchParams();

  if (filters?.accountId) {
    params.set(
      "account_id",
      filters.accountId
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