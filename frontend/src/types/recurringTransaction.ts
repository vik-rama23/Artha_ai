export type RecurringType =
  | "LOAN_EMI"
  | "SIP"
  | "RD"
  | "INSURANCE"
  | "RENT"
  | "SUBSCRIPTION"
  | "UTILITY"
  | "SALARY"
  | "OTHER";

export type RecurringFrequency =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export type TransactionType =
  | "INCOME"
  | "EXPENSE";

export type RecurringTransaction = {
  id: string;
  user_id: string;

  account_id: string;
  account_name: string;
  account_institution_name: string | null;

  category_id: string | null;
  category_name: string | null;

  name: string;
  recurring_type: RecurringType;
  transaction_type: TransactionType;

  amount: string;

  frequency: RecurringFrequency;

  start_date: string;
  end_date: string | null;

  next_occurrence: string;
  last_generated_date: string | null;

  merchant: string | null;
  description: string | null;
  notes: string | null;

  is_active: boolean;

  created_at: string;
  updated_at: string;
};

export type RecurringTransactionListResponse = {
  items: RecurringTransaction[];
  total: number;
};

export type CreateRecurringTransactionPayload = {
  account_id: string;
  category_id: string | null;

  name: string;
  recurring_type: RecurringType;
  transaction_type: TransactionType;

  amount: number;

  frequency: RecurringFrequency;

  start_date: string;
  end_date: string | null;
  next_occurrence: string;

  merchant: string | null;
  description: string | null;
  notes: string | null;
};

export type UpdateRecurringTransactionPayload = {
  account_id?: string;
  category_id?: string | null;

  name?: string;
  recurring_type?: RecurringType;
  transaction_type?: TransactionType;

  amount?: number;

  frequency?: RecurringFrequency;

  start_date?: string;
  end_date?: string | null;
  next_occurrence?: string;

  merchant?: string | null;
  description?: string | null;
  notes?: string | null;

  is_active?: boolean;
};

export type GenerateRecurringTransactionResponse = {
  recurring_transaction_id: string;
  generated_transaction_id: string;
  generated_transaction_date: string;
  generated_amount: string;
  next_occurrence: string;
  is_active: boolean;
};