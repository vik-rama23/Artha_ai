export type TransactionType =
  | "INCOME"
  | "EXPENSE";

export type Transaction = {
  category_name: string;
  id: string;
  user_id?: string;

  account_id: string;
  account_name: string;
  account_institution_name: string | null;

  category_id: string | null;

  transaction_type: TransactionType;

  amount: string;

  transaction_date: string;

  description: string | null;
  merchant: string | null;
  notes?: string | null;
};

export type CreateTransactionPayload = {
  account_id: string;
  category_id?: string | null;
  transaction_type: TransactionType;
  amount: number;
  transaction_date: string;
  description?: string | null;
  merchant?: string | null;
  notes?: string | null;
};

export type UpdateTransactionPayload = {
  account_id?: string;
  category_id?: string | null;
  transaction_type?: TransactionType;
  amount?: number;
  transaction_date?: string;
  description?: string | null;
  merchant?: string | null;
  notes?: string | null;
};

export type TransactionListResponse = {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
};