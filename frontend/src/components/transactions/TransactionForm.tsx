"use client";

import {
  ArrowLeft,
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
  createTransaction,
  updateTransaction,
} from "@/lib/api/transactions";

import type {
  Transaction,
  TransactionType,
} from "@/types/transaction";

import styles from "./TransactionForm.module.scss";

type FormState = {
  transaction_type: TransactionType;
  amount: number;
  transaction_date: string;
  account_id: string;
  category_id: string;
  merchant: string;
  description: string;
  notes: string;
};

type TransactionFormProps = {
  mode?: "create" | "edit";
  transactionId?: string;
  initialTransaction?: Transaction;
};

function getToday() {
  return new Date()
    .toISOString()
    .split("T")[0];
}

function transactionToFormState(
  transaction: Transaction
): FormState {
  return {
    transaction_type:
      transaction.transaction_type,

    amount: Number(transaction.amount),

    transaction_date:
      transaction.transaction_date,

    account_id:
      transaction.account_id,

    category_id:
      transaction.category_id ?? "",

    merchant:
      transaction.merchant ?? "",

    description:
      transaction.description ?? "",

    notes:
      transaction.notes ?? "",
  };
}

export default function TransactionForm({
  mode = "create",
  transactionId,
  initialTransaction,
}: TransactionFormProps) {
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

  const [form, setForm] =
    useState<FormState>(() => {
      if (initialTransaction) {
        return transactionToFormState(
          initialTransaction
        );
      }

      return {
        transaction_type: "EXPENSE",
        amount: 0,
        transaction_date: getToday(),
        account_id: "",
        category_id: "",
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
    if (!initialTransaction) {
      return;
    }

    setForm(
      transactionToFormState(
        initialTransaction
      )
    );
  }, [initialTransaction]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoadingAccounts(true);

        const response =
          await getAccounts();

        setAccounts(response);

        if (
          response.length > 0 &&
          !initialTransaction
        ) {
          setForm((current) => ({
            ...current,
            account_id:
              current.account_id ||
              response[0].id,
          }));
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load accounts."
        );
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, [initialTransaction]);

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true);

        const response =
          await getCategories();

        setCategories(response.items);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load categories."
        );
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  const filteredCategories =
    useMemo(() => {
      return categories.filter(
        (category) =>
          category.category_type ===
            form.transaction_type &&
          category.is_active
      );
    }, [
      categories,
      form.transaction_type,
    ]);

  useEffect(() => {
    const categoryStillValid =
      filteredCategories.some(
        (category) =>
          category.id ===
          form.category_id
      );

    if (
      !categoryStillValid &&
      !isEditMode
    ) {
      setForm((current) => ({
        ...current,
        category_id:
          filteredCategories.length > 0
            ? filteredCategories[0].id
            : "",
      }));
    }
  }, [
    filteredCategories,
    form.category_id,
    isEditMode,
  ]);

  function updateField<
    K extends keyof FormState
  >(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleTransactionTypeChange(
    transactionType: TransactionType
  ) {
    setForm((current) => ({
      ...current,
      transaction_type:
        transactionType,
      category_id: "",
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.account_id) {
      setError(
        "Please select an account."
      );
      return;
    }

    if (!form.category_id) {
      setError(
        "Please select a category."
      );
      return;
    }

    if (form.amount <= 0) {
      setError(
        "Amount must be greater than zero."
      );
      return;
    }

    if (!form.transaction_date) {
      setError(
        "Please select a transaction date."
      );
      return;
    }

    if (
      isEditMode &&
      !transactionId
    ) {
      setError(
        "Transaction ID is missing."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        account_id:
          form.account_id,

        category_id:
          form.category_id,

        transaction_type:
          form.transaction_type,

        amount:
          Number(form.amount),

        transaction_date:
          form.transaction_date,

        merchant:
          form.merchant.trim() || null,

        description:
          form.description.trim() || null,

        notes:
          form.notes.trim() || null,
      };

      if (isEditMode) {
        await updateTransaction(
          transactionId!,
          payload
        );
      } else {
        await createTransaction(
          payload
        );
      }

      router.push(
        isEditMode
          ? `/transactions/${transactionId}`
          : "/transactions"
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
            ? "Unable to update transaction."
            : "Unable to create transaction."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectedAccount =
    accounts.find(
      (account) =>
        account.id ===
        form.account_id
    );

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <div className={styles.formGrid}>
        <div
          className={`${styles.field} ${styles.fullWidth}`}
        >
          <label>
            Transaction Type
          </label>

          <div
            className={styles.typeToggle}
          >
            <button
              type="button"
              className={
                form.transaction_type ===
                "EXPENSE"
                  ? `${styles.typeButton} ${styles.expenseActive}`
                  : styles.typeButton
              }
              onClick={() =>
                handleTransactionTypeChange(
                  "EXPENSE"
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
                  ? `${styles.typeButton} ${styles.incomeActive}`
                  : styles.typeButton
              }
              onClick={() =>
                handleTransactionTypeChange(
                  "INCOME"
                )
              }
              disabled={submitting}
            >
              Income
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="amount">
            Amount
          </label>

          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={
              form.amount || ""
            }
            onChange={(event) =>
              updateField(
                "amount",
                Number(
                  event.target.value
                )
              )
            }
            placeholder="0.00"
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="transaction_date">
            Date
          </label>

          <input
            id="transaction_date"
            type="date"
            value={
              form.transaction_date
            }
            onChange={(event) =>
              updateField(
                "transaction_date",
                event.target.value
              )
            }
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="account_id">
            Account
          </label>

          <select
            id="account_id"
            value={
              form.account_id
            }
            onChange={(event) =>
              updateField(
                "account_id",
                event.target.value
              )
            }
            disabled={
              submitting ||
              loadingAccounts
            }
          >
            {loadingAccounts ? (
              <option value="">
                Loading accounts...
              </option>
            ) : accounts.length === 0 ? (
              <option value="">
                No accounts available
              </option>
            ) : (
              accounts.map(
                (account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                    {account.institution_name
                      ? ` — ${account.institution_name}`
                      : ""}
                  </option>
                )
              )
            )}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="category_id">
            Category
          </label>

          <select
            id="category_id"
            value={
              form.category_id
            }
            onChange={(event) =>
              updateField(
                "category_id",
                event.target.value
              )
            }
            disabled={
              submitting ||
              loadingCategories
            }
          >
            {loadingCategories ? (
              <option value="">
                Loading categories...
              </option>
            ) : filteredCategories.length ===
              0 ? (
              <option value="">
                No categories available
              </option>
            ) : (
              filteredCategories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )
            )}
          </select>

          {!loadingCategories &&
            filteredCategories.length ===
              0 && (
              <p
                className={
                  styles.helperText
                }
              >
                Create a{" "}
                {form.transaction_type ===
                "EXPENSE"
                  ? "expense"
                  : "income"}{" "}
                category first.
              </p>
            )}
        </div>

        <div className={styles.field}>
          <label htmlFor="merchant">
            Merchant
          </label>

          <input
            id="merchant"
            type="text"
            value={
              form.merchant
            }
            onChange={(event) =>
              updateField(
                "merchant",
                event.target.value
              )
            }
            placeholder="e.g. DMart"
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="description">
            Description
          </label>

          <input
            id="description"
            type="text"
            value={
              form.description
            }
            onChange={(event) =>
              updateField(
                "description",
                event.target.value
              )
            }
            placeholder="What was this transaction for?"
            disabled={submitting}
          />
        </div>

        <div
          className={`${styles.field} ${styles.fullWidth}`}
        >
          <label htmlFor="notes">
            Notes
          </label>

          <textarea
            id="notes"
            rows={4}
            value={form.notes}
            onChange={(event) =>
              updateField(
                "notes",
                event.target.value
              )
            }
            placeholder="Optional notes"
            disabled={submitting}
          />
        </div>
      </div>

      {selectedAccount && (
        <div
          className={styles.accountInfo}
        >
          <strong>
            Transaction will be recorded
            in{" "}
            {selectedAccount.name}
          </strong>

          <span>
            Current balance:{" "}
            {selectedAccount.currency}{" "}
            {Number(
              selectedAccount.current_balance
            ).toLocaleString(
              "en-IN"
            )}
          </span>
        </div>
      )}

      {error && (
        <div
          className={styles.error}
        >
          {error}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={
            styles.secondaryButton
          }
          onClick={() =>
            router.push(
              isEditMode &&
                transactionId
                ? `/transactions/${transactionId}`
                : "/transactions"
            )
          }
          disabled={submitting}
        >
          <ArrowLeft size={17} />

          Cancel
        </button>

        <button
          type="submit"
          className={
            styles.primaryButton
          }
          disabled={
            submitting ||
            loadingAccounts ||
            loadingCategories ||
            accounts.length === 0 ||
            filteredCategories.length ===
              0
          }
        >
          <Save size={17} />

          {submitting
            ? isEditMode
              ? "Updating..."
              : "Saving..."
            : isEditMode
              ? "Save Changes"
              : "Save Transaction"}
        </button>
      </div>
    </form>
  );
}