"use client";

import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  getTransaction,
} from "@/lib/api/transactions";

import type {
  Transaction,
} from "@/types/transaction";

import TransactionForm from "@/components/transactions/TransactionForm";

import styles from "./edit-transaction.module.scss";

export default function EditTransactionPage() {
  const params = useParams();

  const transactionId =
    params.transactionId as string;

  const [transaction, setTransaction] =
    useState<Transaction | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadTransaction() {
      try {
        setLoading(true);
        setError(null);

        const response =
          await getTransaction(
            transactionId
          );

        setTransaction(response);
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

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.state}>
          Loading transaction...
        </div>
      </main>
    );
  }

  if (error || !transaction) {
    return (
      <main className={styles.page}>
        <div className={styles.state}>
          <strong>
            Unable to load transaction
          </strong>

          <span>
            {error ??
              "Transaction not found."}
          </span>

          <Link
            href="/transactions"
            className={styles.backButton}
          >
            <ArrowLeft size={17} />
            Back to Transactions
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            MONEY ACTIVITY
          </p>

          <h1>
            Edit Transaction
          </h1>

          <p className={styles.subtitle}>
            Update the transaction details.
          </p>
        </div>

        <Link
          href={`/transactions/${transaction.id}`}
          className={styles.backButton}
        >
          <ArrowLeft size={17} />
          Back to Details
        </Link>
      </header>

      <section className={styles.card}>
        <TransactionForm
          mode="edit"
          transactionId={
            transaction.id
          }
          initialTransaction={
            transaction
          }
        />
      </section>
    </main>
  );
}