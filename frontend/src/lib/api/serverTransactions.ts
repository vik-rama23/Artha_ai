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

  return serverApiClient<TransactionListResponse>(
    endpoint
  );
}