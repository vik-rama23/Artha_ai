import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

import type {
  DashboardCategoryExpense,
  DashboardTransaction,
} from "@/types/dashboard";

import styles from "./RecentTransactions.module.scss";

type RecentTransactionsProps = {
  transactions: DashboardTransaction[];
  categories: DashboardCategoryExpense[];
};

function formatCurrency(value: string | number) {
  const numericValue =
    typeof value === "string"
      ? Number(value)
      : value;

  if (!Number.isFinite(numericValue)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function formatTransactionDate(date: string) {
  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function getTransactionTitle(
  transaction: DashboardTransaction
) {
  return (
    transaction.merchant ||
    transaction.description ||
    "Transaction"
  );
}

function getCategoryName(
  transaction: DashboardTransaction,
  categories: DashboardCategoryExpense[]
) {
  return (
    transaction.category_name ||
    categories.find(
      (category) =>
        category.category_id ===
        transaction.category_id
    )?.category_name ||
    "Uncategorized"
  );
}

function getAccountName(
  transaction: DashboardTransaction
) {
  return (
    transaction.account_name ||
    "Account"
  );
}

export default function RecentTransactions({
  transactions,
  categories,
}: RecentTransactionsProps) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2>Recent Transactions</h2>

          <p>
            Your latest spending activity
          </p>
        </div>

        <Link
          href="/transactions"
          className={styles.viewAll}
        >
          View all
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className={styles.emptyState}>
          No transactions yet.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          {/* ------------------------------------------ */}
          {/* Table Header */}
          {/* ------------------------------------------ */}

          <div className={styles.tableHeader}>
            <div>Transaction</div>

            <div>Category</div>

            <div>Account</div>

            <div>Date</div>

            <div className={styles.amountHeader}>
              Amount
            </div>
          </div>

          {/* ------------------------------------------ */}
          {/* Transactions */}
          {/* ------------------------------------------ */}

          <div className={styles.transactionList}>
            {transactions.map(
              (transaction) => {
                const isExpense =
                  transaction.transaction_type ===
                  "EXPENSE";

                const title =
                  getTransactionTitle(
                    transaction
                  );

                const category =
                  getCategoryName(
                    transaction,
                    categories
                  );

                const accountName =
                  getAccountName(
                    transaction
                  );

                const institution =
                  transaction.account_institution_name;

                return (
                  <Link
                    key={transaction.id}
                    href={`/transactions/${transaction.id}`}
                    className={
                      styles.transactionRow
                    }
                  >
                    {/* Transaction */}

                    <div
                      className={
                        styles.transactionCell
                      }
                    >
                      <div
                        className={
                          `${styles.transactionIcon} ${
                            isExpense
                              ? styles.expenseIcon
                              : styles.incomeIcon
                          }`
                        }
                      >
                        {isExpense ? (
                          <ArrowDownRight
                            size={18}
                            strokeWidth={2}
                          />
                        ) : (
                          <ArrowUpRight
                            size={18}
                            strokeWidth={2}
                          />
                        )}
                      </div>

                      <div
                        className={
                          styles.transactionDetails
                        }
                      >
                        <strong>
                          {title}
                        </strong>

                        {transaction.description &&
                          transaction.merchant && (
                            <span>
                              {
                                transaction.description
                              }
                            </span>
                          )}
                      </div>
                    </div>

                    {/* Category */}

                    <div
                      className={
                        styles.categoryCell
                      }
                    >
                      <span
                        className={
                          styles.categoryBadge
                        }
                      >
                        {category}
                      </span>
                    </div>

                    {/* Account */}

                    <div
                      className={
                        styles.accountCell
                      }
                    >
                      <strong>
                        {accountName}
                      </strong>

                      {institution && (
                        <span>
                          {institution}
                        </span>
                      )}
                    </div>

                    {/* Date */}

                    <div
                      className={
                        styles.dateCell
                      }
                    >
                      {formatTransactionDate(
                        transaction.transaction_date
                      )}
                    </div>

                    {/* Amount */}

                    <div
                      className={
                        `${styles.amountCell} ${
                          isExpense
                            ? styles.expenseAmount
                            : styles.incomeAmount
                        }`
                      }
                    >
                      {isExpense
                        ? "-"
                        : "+"}

                      {formatCurrency(
                        transaction.amount
                      )}
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        </div>
      )}
    </section>
  );
}