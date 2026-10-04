import { serverApiClient } from "./serverClient";

import type {
  TransactionListResponse,
} from "@/types/transaction";

import type {
  TransactionFilters,
} from "./transactions";

export async function getServerTransactions(
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

  if (filters?.limit !== undefined) {
    params.set(
      "limit",
      String(filters.limit)
    );
  }

  if (filters?.offset !== undefined) {
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

  return serverApiClient<TransactionListResponse>(
    endpoint
  );
}