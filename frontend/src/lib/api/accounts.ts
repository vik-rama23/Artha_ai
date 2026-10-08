import { apiClient } from "./client";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  institution_name: string | null;
  account_number_last4: string | null;
  opening_balance: string;
  opening_balance_date: string;
  current_balance: string;
  currency: string;
  notes: string | null;
};

export type CreateAccountPayload = {
  name: string;
  account_type: string;
  institution_name?: string | null;
  account_number_last4?: string | null;
  opening_balance: number;
  opening_balance_date: string;
  currency: string;
  notes?: string | null;
};

export type UpdateAccountPayload = {
  name?: string;
  account_type?: string;
  institution_name?: string | null;
  account_number_last4?: string | null;
  opening_balance?: number;
  opening_balance_date?: string;
  currency?: string;
  notes?: string | null;
};

export async function getAccounts(): Promise<Account[]> {
  return apiClient<Account[]>(
    "/api/v1/accounts"
  );
}

export async function getAccount(
  accountId: string
): Promise<Account> {
  return apiClient<Account>(
    `/api/v1/accounts/${accountId}`
  );
}

export async function createAccount(
  payload: CreateAccountPayload
): Promise<Account> {
  return apiClient<Account>(
    "/api/v1/accounts",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateAccount(
  accountId: string,
  payload: UpdateAccountPayload
): Promise<Account> {
  return apiClient<Account>(
    `/api/v1/accounts/${accountId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteAccount(
  accountId: string
): Promise<void> {
  await apiClient<void>(
    `/api/v1/accounts/${accountId}`,
    {
      method: "DELETE",
    }
  );
}
