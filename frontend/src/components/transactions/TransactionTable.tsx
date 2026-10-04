"use client";

import { useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  Repeat2,
} from "lucide-react";

import type { Transaction } from "@/types/transaction";

import { deleteTransaction } from "@/lib/api/transactions";

import styles from "./TransactionTable.module.scss";

type TransactionTableProps = {
  transactions: Transaction[];
};

function formatCurrency(value: string | number) {
  const amount =
    typeof value === "string"
      ? Number(value)
      : value;

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function getTitle(transaction: Transaction) {
  return (
    transaction.merchant ||
    transaction.description ||
    "Transaction"
  );
}

function getCategoryName(
  transaction: Transaction
) {
  return (
    transaction.category_name ||
    "Uncategorized"
  );
}

export default function TransactionTable({
  transactions,
}: TransactionTableProps) {
  const router = useRouter();

  const [deleteTarget, setDeleteTarget] =
    useState<Transaction | null>(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState<string | null>(null);

  function openDeleteModal(
    transaction: Transaction
  ) {
    if (isDeleting) {
      return;
    }

    setDeleteError(null);
    setDeleteTarget(transaction);
  }

  function closeDeleteModal() {
    if (isDeleting) {
      return;
    }

    setDeleteError(null);
    setDeleteTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);

      await deleteTransaction(
        deleteTarget.id
      );

      setDeleteTarget(null);

      router.refresh();
    } catch (error) {
      console.error(
        "Failed to delete transaction:",
        error
      );

      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete this transaction. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className={styles.tableWrapper}>
        {/* ------------------------------------------------ */}
        {/* Header */}
        {/* ------------------------------------------------ */}

        <div className={styles.tableHeader}>
          <div>Transaction</div>

          <div>Category</div>

          <div>Account</div>

          <div>Date</div>

          <div className={styles.amountHeader}>
            Amount
          </div>

          <div className={styles.actionsHeader}>
            Actions
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* Rows */}
        {/* ------------------------------------------------ */}

        <div className={styles.tableBody}>
          {transactions.map((transaction) => {
            const isExpense =
              transaction.transaction_type ===
              "EXPENSE";

            const isRecurring =
              Boolean(
                transaction.recurring_transaction_id
              );

            const title =
              getTitle(transaction);

            const category =
              getCategoryName(transaction);

            return (
              <div
                key={transaction.id}
                className={
                  styles.transactionRow
                }
              >
                {/* ---------------------------------------- */}
                {/* Transaction */}
                {/* ---------------------------------------- */}

                <Link
                  href={`/transactions/${transaction.id}`}
                  className={
                    styles.transactionCell
                  }
                >
                  <div
                    className={`${
                      styles.transactionIcon
                    } ${
                      isExpense
                        ? styles.expenseIcon
                        : styles.incomeIcon
                    }`}
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

                    {isRecurring && (
                      <span
                        title="Generated from a recurring transaction rule"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          marginTop: "4px",
                          width: "fit-content",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        <Repeat2
                          size={13}
                          strokeWidth={2}
                        />

                        Recurring
                      </span>
                    )}
                  </div>
                </Link>

                {/* ---------------------------------------- */}
                {/* Category */}
                {/* ---------------------------------------- */}

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

                {/* ---------------------------------------- */}
                {/* Account */}
                {/* ---------------------------------------- */}

                <div
                  className={
                    styles.accountCell
                  }
                >
                  <strong>
                    {
                      transaction.account_name
                    }
                  </strong>

                  {transaction.account_institution_name && (
                    <span>
                      {
                        transaction.account_institution_name
                      }
                    </span>
                  )}
                </div>

                {/* ---------------------------------------- */}
                {/* Date */}
                {/* ---------------------------------------- */}

                <div
                  className={
                    styles.dateCell
                  }
                >
                  {formatDate(
                    transaction.transaction_date
                  )}
                </div>

                {/* ---------------------------------------- */}
                {/* Amount */}
                {/* ---------------------------------------- */}

                <div
                  className={`${
                    styles.amountCell
                  } ${
                    isExpense
                      ? styles.expenseAmount
                      : styles.incomeAmount
                  }`}
                >
                  {isExpense ? "-" : "+"}

                  {formatCurrency(
                    transaction.amount
                  )}
                </div>

                {/* ---------------------------------------- */}
                {/* Actions */}
                {/* ---------------------------------------- */}

                <div
                  className={styles.actions}
                >
                  {/* View */}

                  <Link
                    href={`/transactions/${transaction.id}`}
                    className={
                      styles.actionButton
                    }
                    title="View transaction"
                    aria-label="View transaction"
                  >
                    <Eye
                      size={16}
                      strokeWidth={2}
                    />
                  </Link>

                  {/* Edit */}

                  <Link
                    href={`/transactions/${transaction.id}/edit`}
                    className={
                      styles.actionButton
                    }
                    title="Edit transaction"
                    aria-label="Edit transaction"
                  >
                    <Pencil
                      size={16}
                      strokeWidth={2}
                    />
                  </Link>

                  {/* Delete */}

                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    title="Delete transaction"
                    aria-label="Delete transaction"
                    onClick={() =>
                      openDeleteModal(
                        transaction
                      )
                    }
                    disabled={isDeleting}
                  >
                    <Trash2
                      size={16}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* Delete Confirmation Modal */}
      {/* ------------------------------------------------ */}

      {deleteTarget && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDeleteModal();
            }
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-transaction-title"
            aria-describedby="delete-transaction-description"
          >
            {/* Close */}

            <button
              type="button"
              className={
                styles.modalCloseButton
              }
              onClick={closeDeleteModal}
              disabled={isDeleting}
              aria-label="Close delete confirmation"
            >
              <X size={18} />
            </button>

            {/* Icon */}

            <div
              className={styles.modalIcon}
            >
              <AlertTriangle
                size={22}
                strokeWidth={2}
              />
            </div>

            {/* Content */}

            <div
              className={styles.modalContent}
            >
              <h2
                id="delete-transaction-title"
              >
                Delete transaction?
              </h2>

              <p
                id="delete-transaction-description"
              >
                This action cannot be undone.
                The transaction will be
                permanently removed from your
                account history.
              </p>

              <div
                className={
                  styles.deletePreview
                }
              >
                <div>
                  <span>
                    Transaction
                  </span>

                  <strong>
                    {getTitle(
                      deleteTarget
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Amount
                  </span>

                  <strong
                    className={
                      deleteTarget.transaction_type ===
                      "EXPENSE"
                        ? styles.previewExpense
                        : styles.previewIncome
                    }
                  >
                    {deleteTarget.transaction_type ===
                    "EXPENSE"
                      ? "-"
                      : "+"}

                    {formatCurrency(
                      deleteTarget.amount
                    )}
                  </strong>
                </div>
              </div>

              {/* Error */}

              {deleteError && (
                <div
                  className={
                    styles.modalError
                  }
                  role="alert"
                >
                  {deleteError}
                </div>
              )}

              {/* Actions */}

              <div
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={
                    closeDeleteModal
                  }
                  disabled={isDeleting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={
                    styles.confirmDeleteButton
                  }
                  onClick={
                    handleDelete
                  }
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2
                        size={16}
                        className={
                          styles.spinner
                        }
                      />

                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2
                        size={16}
                      />

                      Delete Transaction
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}