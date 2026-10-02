export type DashboardCategoryExpense = {
  category_id: string;
  category_name: string;
  amount: string;
  percentage: string;
};

export type DashboardMonthlyCashFlow = {
  month: string;
  income: string;
  expense: string;
  net: string;
};

export type DashboardTransaction = {
  id: string;
  account_id: string;
  category_id: string | null;
  transaction_type: "INCOME" | "EXPENSE";
  amount: string;
  transaction_date: string;
  description: string | null;
  merchant: string | null;
  notes: string | null;
  account_name: string;
  account_institution_name: string | null;
  category_name: string | null;
};

export type DashboardData = {
  user_id: string;
  balance: string;
  income: string;
  expense: string;
  net: string;
  start_date: string | null;
  end_date: string | null;
  expenses_by_category: DashboardCategoryExpense[];
  monthly_cash_flow: DashboardMonthlyCashFlow[];
  recent_transactions: DashboardTransaction[];
};