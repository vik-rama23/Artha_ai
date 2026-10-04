"use client";

import Link from "next/link";

import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  FileText,
  Pencil,
  Store,
  Tag,
  Trash2,
  Repeat2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  deleteTransaction,
  getTransaction,
} from "@/lib/api/transactions";

import {
  getCategories,
  type Category,
} from "@/lib/api/categories";

import type { Transaction } from "@/types/transaction";

import styles from "./transaction-details.module.scss";

function formatCurrency(
  value: string | number
) {
  const amount =
    typeof value === "string"
      ? Number(value)
      : value;

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(amount);
}

function formatDate(date: string) {
  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default function TransactionDetailsPage() {
  const params = useParams();

  const router = useRouter();

  const transactionId =
    params.transactionId as string;

  const [transaction, setTransaction] =
    useState<Transaction | null>(
      null
    );

  const [category, setCategory] =
    useState<Category | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadTransaction() {
      try {
        setLoading(true);
        setError(null);

        const [
          transactionResponse,
          categoriesResponse,
        ] = await Promise.all([
          getTransaction(
            transactionId
          ),
          getCategories(),
        ]);

        setTransaction(
          transactionResponse
        );

        const matchedCategory =
          categoriesResponse.items.find(
            (item) =>
              item.id ===
              transactionResponse.category_id
          );

        setCategory(
          matchedCategory ?? null
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load transaction."
        );
      } finally {
        setLoading(false);
      }
    }

    if (transactionId) {
      loadTransaction();
    }
  }, [transactionId]);

  async function handleDelete() {
    if (!transaction) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this transaction? This action cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      await deleteTransaction(
        transaction.id
      );

      router.push("/transactions");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete transaction."
      );

      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.state}>
          Loading transaction...
        </div>
      </main>
    );
  }

  if (error && !transaction) {
    return (
      <main className={styles.page}>
        <div className={styles.state}>
          <strong>
            Unable to load transaction
          </strong>

          <span>{error}</span>

          <Link
            href="/transactions"
            className={
              styles.backButton
            }
          >
            <ArrowLeft size={17} />
            Back to Transactions
          </Link>
        </div>
      </main>
    );
  }

  if (!transaction) {
    return null;
  }

  const isExpense =
    transaction.transaction_type ===
    "EXPENSE";

  const isRecurring =
    Boolean(
      transaction.recurring_transaction_id
    );

  const title =
    transaction.merchant ||
    transaction.description ||
    "Transaction";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            MONEY ACTIVITY
          </p>

          <h1>
            Transaction Details
          </h1>

          <p className={styles.subtitle}>
            Review the details of this
            transaction.
          </p>
        </div>

        <Link
          href="/transactions"
          className={styles.backButton}
        >
          <ArrowLeft size={17} />
          Back
        </Link>
      </header>

      <section className={styles.card}>
        <div className={styles.hero}>
          <div
            className={`${styles.icon} ${
              isExpense
                ? styles.expenseIcon
                : styles.incomeIcon
            }`}
          >
            {isExpense ? (
              <ArrowDownRight
                size={28}
              />
            ) : (
              <ArrowUpRight
                size={28}
              />
            )}
          </div>

          <div
            className={
              styles.heroContent
            }
          >
            <span>
              {isExpense
                ? "Expense"
                : "Income"}
            </span>

            <h2>{title}</h2>

            <strong
              className={
                isExpense
                  ? styles.expenseAmount
                  : styles.incomeAmount
              }
            >
              {isExpense ? "-" : "+"}

              {formatCurrency(
                transaction.amount
              )}
            </strong>

            {isRecurring && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "8px",
                  width: "fit-content",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
                title="Generated from a recurring transaction rule"
              >
                <Repeat2
                  size={15}
                  strokeWidth={2}
                />

                Recurring Transaction
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.detailsGrid}>
          <div className={styles.detail}>
            <div
              className={
                styles.detailIcon
              }
            >
              <CalendarDays
                size={18}
              />
            </div>

            <div>
              <span>Date</span>

              <strong>
                {formatDate(
                  transaction.transaction_date
                )}
              </strong>
            </div>
          </div>

          <div className={styles.detail}>
            <div
              className={
                styles.detailIcon
              }
            >
              <CreditCard
                size={18}
              />
            </div>

            <div>
              <span>Account</span>

              <strong>
                {transaction.account_name}
              </strong>

              {transaction.account_institution_name && (
                <small>
                  {
                    transaction.account_institution_name
                  }
                </small>
              )}
            </div>
          </div>

          <div className={styles.detail}>
            <div
              className={
                styles.detailIcon
              }
            >
              <Tag size={18} />
            </div>

            <div>
              <span>Category</span>

              <strong>
                {category?.name ??
                  "Uncategorized"}
              </strong>
            </div>
          </div>

          <div className={styles.detail}>
            <div
              className={
                styles.detailIcon
              }
            >
              <Store size={18} />
            </div>

            <div>
              <span>Merchant</span>

              <strong>
                {transaction.merchant ??
                  "Not provided"}
              </strong>
            </div>
          </div>
        </div>

        {isRecurring && (
          <div
            className={styles.textSection}
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <Repeat2 size={18} />

              Recurring Transaction
            </div>

            <p>
              This transaction was
              automatically generated from
              a recurring transaction rule.
            </p>

            <small
              style={{
                display: "block",
                marginTop: "8px",
                wordBreak: "break-all",
              }}
            >
              Recurring Rule ID:{" "}
              {
                transaction.recurring_transaction_id
              }
            </small>
          </div>
        )}

        <div
          className={styles.textSection}
        >
          <div
            className={
              styles.sectionTitle
            }
          >
            <FileText size={18} />

            Description
          </div>

          <p>
            {transaction.description ??
              "No description provided."}
          </p>
        </div>

        <div
          className={styles.textSection}
        >
          <div
            className={
              styles.sectionTitle
            }
          >
            <FileText size={18} />

            Notes
          </div>

          <p>
            {transaction.notes ??
              "No notes added."}
          </p>
        </div>

        <div className={styles.actions}>
          <Link
            href={`/transactions/${transaction.id}/edit`}
            className={
              styles.editButton
            }
          >
            <Pencil size={17} />
            Edit Transaction
          </Link>

          <button
            type="button"
            className={
              styles.deleteButton
            }
            onClick={handleDelete}
            disabled={deleting}
            title="Delete transaction"
            aria-label="Delete transaction"
          >
            <Trash2 size={17} />

            {deleting
              ? "Deleting..."
              : "Delete Transaction"}
          </button>
        </div>
      </section>
    </main>
  );
}