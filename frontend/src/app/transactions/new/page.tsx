import Link from "next/link";

import TransactionForm from "@/components/transactions/TransactionForm";

import styles from "./new-transaction.module.scss";

export default function NewTransactionPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            MONEY ACTIVITY
          </p>

          <h1>Add Transaction</h1>

          <p className={styles.subtitle}>
            Record an income or expense.
          </p>
        </div>

        <Link
          href="/transactions"
          className={styles.backButton}
        >
          Back to Transactions
        </Link>
      </header>

      <TransactionForm />
    </main>
  );
}