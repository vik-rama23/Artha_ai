import Link from "next/link";

import { Plus } from "lucide-react";

import {
  type TransactionFilters as TransactionFilterParams,
} from "@/lib/api/transactions";

import { getServerTransactions } from "@/lib/api/serverTransactions";

import TransactionFilters from "@/components/transactions/TransactionFilters";

import TransactionTable from "@/components/transactions/TransactionTable";

import type { Transaction } from "@/types/transaction";

import styles from "./transactions.module.scss";

type TransactionsPageProps = {
  searchParams: Promise<{
    account_id?: string;
    transaction_type?:
      | "INCOME"
      | "EXPENSE";
    start_date?: string;
    end_date?: string;
  }>;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;

  const filters: TransactionFilterParams = {
    accountId: params.account_id,
    transactionType:
      params.transaction_type,
    startDate: params.start_date,
    endDate: params.end_date,
  };

  let transactions: Transaction[] = [];
  let total = 0;
  let error = false;

  try {
    const response =
      await getServerTransactions(
        filters
      );

    transactions = response.items;
    total = response.total;
  } catch (err) {
    console.error(
      "Failed to load transactions:",
      err
    );

    error = true;
  }

  const hasFilters =
    Boolean(params.account_id) ||
    Boolean(params.transaction_type) ||
    Boolean(params.start_date) ||
    Boolean(params.end_date);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            MONEY ACTIVITY
          </p>

          <h1>
            Transactions
          </h1>

          <p
            className={
              styles.subtitle
            }
          >
            Track every income and expense
            in one place.
          </p>
        </div>

        <Link
          href="/transactions/new"
          className={styles.addButton}
        >
          <Plus size={18} />

          Add Transaction
        </Link>
      </header>

      <section className={styles.card}>
        <div
          className={
            styles.cardHeader
          }
        >
          <div>
            <h2>
              All Transactions
            </h2>

            <p>
              {total} transaction
              {total === 1
                ? ""
                : "s"}
            </p>
          </div>

          {hasFilters && (
            <span
              className={
                styles.filteredLabel
              }
            >
              Filters applied
            </span>
          )}
        </div>

        <TransactionFilters />

        {error ? (
          <div
            className={
              styles.emptyState
            }
          >
            <strong>
              Unable to load
              transactions
            </strong>

            <span>
              Make sure the FastAPI
              backend is running on
              port 8001.
            </span>
          </div>
        ) : transactions.length ===
          0 ? (
          <div
            className={
              styles.emptyState
            }
          >
            <strong>
              No transactions found
            </strong>

            <span>
              Try changing or
              clearing your filters.
            </span>

            <Link
              href="/transactions"
              className={
                styles.emptyButton
              }
            >
              Clear Filters
            </Link>
          </div>
        ) : (
          <TransactionTable
            transactions={
              transactions
            }
          />
        )}
      </section>
    </main>
  );
}