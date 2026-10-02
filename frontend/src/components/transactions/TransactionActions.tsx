"use client";

import Link from "next/link";

import {
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

import styles from "./TransactionActions.module.scss";

type TransactionActionsProps = {
  transactionId: string;
};

export default function TransactionActions({
  transactionId,
}: TransactionActionsProps) {
  return (
    <div className={styles.actions}>
      <Link
        href={`/transactions/${transactionId}`}
        className={styles.iconButton}
        title="View transaction"
        aria-label="View transaction"
      >
        <Eye size={17} strokeWidth={2} />
      </Link>

      <Link
        href={`/transactions/${transactionId}/edit`}
        className={styles.iconButton}
        title="Edit transaction"
        aria-label="Edit transaction"
      >
        <Pencil size={17} strokeWidth={2} />
      </Link>

      <Link
        href={`/transactions/${transactionId}`}
        className={`${styles.iconButton} ${styles.deleteButton}`}
        title="Delete transaction"
        aria-label="Delete transaction"
      >
        <Trash2 size={17} strokeWidth={2} />
      </Link>
    </div>
  );
}