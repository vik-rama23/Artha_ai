"use client";

import {
  ArrowLeft,
  CalendarDays,
  IndianRupee,
  Save,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  getAccounts,
  type Account,
} from "@/lib/api/accounts";

import {
  getCategories,
  type Category,
} from "@/lib/api/categories";

import {
  createRecurringTransaction,
  updateRecurringTransaction,
} from "@/lib/api/recurringTransactions";

import type {
  RecurringFrequency,
  RecurringTransaction,
  RecurringType,
  TransactionType,
} from "@/types/recurringTransaction";

import styles from "./RecurringTransactionForm.module.scss";

type FormState = {
  name: string;
  recurring_type: RecurringType;
  transaction_type: TransactionType;
  amount: string;
  account_id: string;
  category_id: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string;
  next_occurrence: string;
  merchant: string;
  description: string;
  notes: string;
};

type RecurringTransactionFormProps = {
  mode?: "create" | "edit";
  recurringTransactionId?: string;
  initialRecurringTransaction?: RecurringTransaction;
};

const recurringTypeOptions: {
  value: RecurringType;
  label: string;
}[] = [
  {
    value: "LOAN_EMI",
    label: "Loan EMI",
  },
  {
    value: "SIP",
    label: "Mutual Fund SIP",
  },
  {
    value: "RD",
    label: "Recurring Deposit",
  },
  {
    value: "INSURANCE",
    label: "Insurance",
  },
  {
    value: "RENT",
    label: "Rent",
  },
  {
    value: "SUBSCRIPTION",
    label: "Subscription",
  },
  {
    value: "UTILITY",
    label: "Utility",
  },
  {
    value: "SALARY",
    label: "Salary",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

const frequencyOptions: {
  value: RecurringFrequency;
  label: string;
}[] = [
  {
    value: "WEEKLY",
    label: "Weekly",
  },
  {
    value: "MONTHLY",
    label: "Monthly",
  },
  {
    value: "QUARTERLY",
    label: "Quarterly",
  },
  {
    value: "YEARLY",
    label: "Yearly",
  },
];

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function recurringTransactionToFormState(
  recurringTransaction: RecurringTransaction,
): FormState {
  return {
    name: recurringTransaction.name,
    recurring_type: recurringTransaction.recurring_type,
    transaction_type:
      recurringTransaction.transaction_type,
    amount: String(recurringTransaction.amount),
    account_id: recurringTransaction.account_id,
    category_id:
      recurringTransaction.category_id ?? "",
    frequency: recurringTransaction.frequency,
    start_date: recurringTransaction.start_date,
    end_date:
      recurringTransaction.end_date ?? "",
    next_occurrence:
      recurringTransaction.next_occurrence,
    merchant:
      recurringTransaction.merchant ?? "",
    description:
      recurringTransaction.description ?? "",
    notes:
      recurringTransaction.notes ?? "",
  };
}

export default function RecurringTransactionForm({
  mode = "create",
  recurringTransactionId,
  initialRecurringTransaction,
}: RecurringTransactionFormProps) {
  const router = useRouter();

  const isEditMode = mode === "edit";

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loadingAccounts, setLoadingAccounts] =
    useState(true);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [form, setForm] = useState<FormState>(() => {
    if (initialRecurringTransaction) {
      return recurringTransactionToFormState(
        initialRecurringTransaction,
      );
    }

    const today = getToday();

    return {
      name: "",
      recurring_type: "LOAN_EMI",
      transaction_type: "EXPENSE",
      amount: "",
      account_id: "",
      category_id: "",
      frequency: "MONTHLY",
      start_date: today,
      end_date: "",
      next_occurrence: today,
      merchant: "",
      description: "",
      notes: "",
    };
  });

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!initialRecurringTransaction) {
      return;
    }

    setForm(
      recurringTransactionToFormState(
        initialRecurringTransaction,
      ),
    );
  }, [initialRecurringTransaction]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoadingAccounts(true);

        const response = await getAccounts();

        setAccounts(response);

        if (
          response.length > 0 &&
          !initialRecurringTransaction
        ) {
          setForm((current) => ({
            ...current,
            account_id:
              current.account_id || response[0].id,
          }));
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load accounts.",
        );
      } finally {
        setLoadingAccounts(false);
      }
    }

    void loadAccounts();
  }, [initialRecurringTransaction]);

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true);

        const response = await getCategories();

        setCategories(response.items);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load categories.",
        );
      } finally {
        setLoadingCategories(false);
      }
    }

    void loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (category) =>
        category.category_type ===
          form.transaction_type &&
        category.is_active,
    );
  }, [
    categories,
    form.transaction_type,
  ]);

  useEffect(() => {
    if (filteredCategories.length === 0) {
      return;
    }

    const categoryStillValid =
      filteredCategories.some(
        (category) =>
          category.id === form.category_id,
      );

    if (!categoryStillValid) {
      setForm((current) => ({
        ...current,
        category_id:
          filteredCategories[0].id,
      }));
    }
  }, [
    filteredCategories,
    form.category_id,
  ]);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleTransactionTypeChange(
    transactionType: TransactionType,
  ) {
    setForm((current) => ({
      ...current,
      transaction_type: transactionType,
      category_id: "",
    }));
  }

  function validateForm(): string | null {
    if (!form.name.trim()) {
      return "Please enter a recurring transaction name.";
    }

    const amount = Number(form.amount);

    if (
      !form.amount ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return "Please enter a valid amount greater than zero.";
    }

    if (!form.account_id) {
      return "Please select an account.";
    }

    if (!form.category_id) {
      return "Please select a category.";
    }

    if (!form.start_date) {
      return "Please select a start date.";
    }

    if (!form.next_occurrence) {
      return "Please select the next occurrence date.";
    }

    if (
      form.end_date &&
      form.end_date < form.start_date
    ) {
      return "End date cannot be before the start date.";
    }

    if (
      form.next_occurrence <
      form.start_date
    ) {
      return "Next occurrence cannot be before the start date.";
    }

    if (
      form.end_date &&
      form.next_occurrence >
        form.end_date
    ) {
      return "Next occurrence cannot be after the end date.";
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError(null);

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        account_id: form.account_id,
        category_id:
          form.category_id || null,
        name: form.name.trim(),
        recurring_type:
          form.recurring_type,
        transaction_type:
          form.transaction_type,
        amount: Number(form.amount),
        frequency: form.frequency,
        start_date: form.start_date,
        end_date:
          form.end_date || null,
        next_occurrence:
          form.next_occurrence,
        merchant:
          form.merchant.trim() || null,
        description:
          form.description.trim() || null,
        notes:
          form.notes.trim() || null,
      };

      if (
        isEditMode &&
        recurringTransactionId
      ) {
        await updateRecurringTransaction(
          recurringTransactionId,
          payload,
        );
      } else {
        await createRecurringTransaction(
          payload,
        );
      }

      router.push(
        "/recurring-transactions",
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save recurring transaction.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (submitting) {
      return;
    }

    router.push(
      "/recurring-transactions",
    );
  }

  if (
    isEditMode &&
    !initialRecurringTransaction
  ) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingState}>
          Loading recurring transaction...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleCancel}
          disabled={submitting}
        >
          <ArrowLeft size={17} />
          Back to recurring transactions
        </button>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              {isEditMode
                ? "EDIT RECURRING TRANSACTION"
                : "NEW RECURRING TRANSACTION"}
            </p>

            <h1>
              {isEditMode
                ? "Edit recurring transaction"
                : "Add recurring transaction"}
            </h1>

            <p className={styles.subtitle}>
              Set up automatic rules for EMIs,
              SIPs, RDs, rent, subscriptions,
              salary and other regular
              transactions.
            </p>
          </div>
        </header>

        {error && (
          <div
            className={styles.error}
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Basic details</h2>
                <p>
                  Tell Artha what this recurring
                  transaction represents.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div
                className={`${styles.field} ${styles.fullWidth}`}
              >
                <label htmlFor="name">
                  Name
                </label>

                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Home Loan EMI"
                  maxLength={150}
                  disabled={submitting}
                />

                <span className={styles.helper}>
                  Use a name that makes the
                  transaction easy to recognize.
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="recurring_type">
                  Recurring type
                </label>

                <select
                  id="recurring_type"
                  value={form.recurring_type}
                  onChange={(event) =>
                    updateField(
                      "recurring_type",
                      event.target
                        .value as RecurringType,
                    )
                  }
                  disabled={submitting}
                >
                  {recurringTypeOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className={styles.field}>
                <label>
                  Transaction type
                </label>

                <div
                  className={
                    styles.segmentedControl
                  }
                >
                  <button
                    type="button"
                    className={
                      form.transaction_type ===
                      "EXPENSE"
                        ? styles.segmentActive
                        : styles.segment
                    }
                    onClick={() =>
                      handleTransactionTypeChange(
                        "EXPENSE",
                      )
                    }
                    disabled={submitting}
                  >
                    Expense
                  </button>

                  <button
                    type="button"
                    className={
                      form.transaction_type ===
                      "INCOME"
                        ? styles.segmentActive
                        : styles.segment
                    }
                    onClick={() =>
                      handleTransactionTypeChange(
                        "INCOME",
                      )
                    }
                    disabled={submitting}
                  >
                    Income
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Amount & account</h2>
                <p>
                  Choose where the recurring
                  transaction will be recorded.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="amount">
                  Amount
                </label>

                <div className={styles.inputWithIcon}>
                  <IndianRupee
                    size={17}
                  />

                  <input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      updateField(
                        "amount",
                        event.target.value,
                      )
                    }
                    placeholder="0.00"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="account_id">
                  Account
                </label>

                <select
                  id="account_id"
                  value={form.account_id}
                  onChange={(event) =>
                    updateField(
                      "account_id",
                      event.target.value,
                    )
                  }
                  disabled={
                    submitting ||
                    loadingAccounts
                  }
                >
                  <option value="">
                    {loadingAccounts
                      ? "Loading accounts..."
                      : "Select account"}
                  </option>

                  {accounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                        {account.institution_name
                          ? ` · ${account.institution_name}`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="category_id">
                  Category
                </label>

                <select
                  id="category_id"
                  value={form.category_id}
                  onChange={(event) =>
                    updateField(
                      "category_id",
                      event.target.value,
                    )
                  }
                  disabled={
                    submitting ||
                    loadingCategories
                  }
                >
                  <option value="">
                    {loadingCategories
                      ? "Loading categories..."
                      : "Select category"}
                  </option>

                  {filteredCategories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ),
                  )}
                </select>

                {!loadingCategories &&
                  filteredCategories.length ===
                    0 && (
                    <span
                      className={
                        styles.helper
                      }
                    >
                      No active categories are
                      available for this
                      transaction type.
                    </span>
                  )}
              </div>

              <div className={styles.field}>
                <label htmlFor="frequency">
                  Frequency
                </label>

                <select
                  id="frequency"
                  value={form.frequency}
                  onChange={(event) =>
                    updateField(
                      "frequency",
                      event.target
                        .value as RecurringFrequency,
                    )
                  }
                  disabled={submitting}
                >
                  {frequencyOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Schedule</h2>
                <p>
                  Define when Artha should
                  generate the transaction.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="start_date">
                  Start date
                </label>

                <div className={styles.inputWithIcon}>
                  <CalendarDays
                    size={17}
                  />

                  <input
                    id="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={(event) =>
                      updateField(
                        "start_date",
                        event.target.value,
                      )
                    }
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="next_occurrence">
                  Next occurrence
                </label>

                <div className={styles.inputWithIcon}>
                  <CalendarDays
                    size={17}
                  />

                  <input
                    id="next_occurrence"
                    type="date"
                    value={
                      form.next_occurrence
                    }
                    onChange={(event) =>
                      updateField(
                        "next_occurrence",
                        event.target.value,
                      )
                    }
                    disabled={submitting}
                  />
                </div>

                <span className={styles.helper}>
                  This is the date used when
                  you choose Generate Now or
                  when automatic scheduling is
                  added later.
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="end_date">
                  End date
                  <span className={styles.optional}>
                    Optional
                  </span>
                </label>

                <div className={styles.inputWithIcon}>
                  <CalendarDays
                    size={17}
                  />

                  <input
                    id="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={(event) =>
                      updateField(
                        "end_date",
                        event.target.value,
                      )
                    }
                    disabled={submitting}
                  />
                </div>

                <span className={styles.helper}>
                  Leave empty for an ongoing
                  recurring transaction.
                </span>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Additional details</h2>
                <p>
                  These fields are optional.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="merchant">
                  Merchant
                  <span className={styles.optional}>
                    Optional
                  </span>
                </label>

                <input
                  id="merchant"
                  type="text"
                  value={form.merchant}
                  onChange={(event) =>
                    updateField(
                      "merchant",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. SBI Home Loan"
                  maxLength={150}
                  disabled={submitting}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="description">
                  Description
                  <span className={styles.optional}>
                    Optional
                  </span>
                </label>

                <input
                  id="description"
                  type="text"
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value,
                    )
                  }
                  placeholder="Monthly home loan payment"
                  maxLength={255}
                  disabled={submitting}
                />
              </div>

              <div
                className={`${styles.field} ${styles.fullWidth}`}
              >
                <label htmlFor="notes">
                  Notes
                  <span className={styles.optional}>
                    Optional
                  </span>
                </label>

                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) =>
                    updateField(
                      "notes",
                      event.target.value,
                    )
                  }
                  placeholder="Add any notes about this recurring transaction..."
                  rows={4}
                  disabled={submitting}
                />
              </div>
            </div>
          </section>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={submitting}
            >
              <Save size={17} />

              {submitting
                ? "Saving..."
                : isEditMode
                  ? "Save Changes"
                  : "Create Recurring Transaction"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}