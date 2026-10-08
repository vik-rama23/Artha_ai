export type CashFlowForecastItem = {
  recurring_transaction_id: string;
  name: string;
  transaction_type: "INCOME" | "EXPENSE";
  amount: string;
  occurrence_date: string;
  frequency: string;
};

export type CashFlowForecast = {
  forecast_start_date: string;
  forecast_end_date: string;
  days_elapsed: number;
  days_remaining: number;

  current_balance: string;

  current_month_income: string;
  current_month_expense: string;
  current_month_net: string;

  expected_recurring_income: string;
  expected_recurring_expense: string;
  projected_variable_expense: string;

  projected_income: string;
  projected_expense: string;
  projected_month_end_balance: string;

  average_daily_variable_expense: string;
  variable_expense_source:
    | "current_month"
    | "previous_3_months"
    | "no_history";

  status: "HEALTHY" | "WATCH" | "RISK";
  insight: string;

  upcoming_items: CashFlowForecastItem[];
};
