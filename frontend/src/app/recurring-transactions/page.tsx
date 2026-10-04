"use client";

import {
  CalendarClock,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Home,
  Landmark,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  deleteRecurringTransaction,
  generateRecurringTransaction,
  getRecurringTransactions,
  pauseRecurringTransaction,
  resumeRecurringTransaction,
} from "@/lib/api/recurringTransactions";

import type {
  RecurringTransaction,
  RecurringType,
} from "@/types/recurringTransaction";

import styles from "./recurring-transactions.module.scss";

type FilterType = "ALL" | RecurringType;

function formatCurrency(
  amount: string | number,
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(value: string): string {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getRecurringTypeLabel(
  type: RecurringType,
): string {
  switch (type) {
    case "LOAN_EMI":
      return "Loan EMI";

    case "SIP":
      return "Mutual Fund / SIP";

    case "RD":
      return "Recurring Deposit";

    case "INSURANCE":
      return "Insurance";

    case "RENT":
      return "Rent";

    case "SUBSCRIPTION":
      return "Subscription";

    case "UTILITY":
      return "Utility";

    case "SALARY":
      return "Salary";

    case "OTHER":
      return "Other";

    default:
      return type;
  }
}

function getFrequencyLabel(
  frequency: RecurringTransaction["frequency"],
): string {
  switch (frequency) {
    case "WEEKLY":
      return "Weekly";

    case "MONTHLY":
      return "Monthly";

    case "QUARTERLY":
      return "Quarterly";

    case "YEARLY":
      return "Yearly";

    default:
      return frequency;
  }
}

function getTypeIcon(type: RecurringType) {
  switch (type) {
    case "LOAN_EMI":
      return Home;

    case "SIP":
      return TrendingUp;

    case "RD":
      return Landmark;

    case "INSURANCE":
      return ShieldCheck;

    case "RENT":
      return Home;

    case "SUBSCRIPTION":
      return CreditCard;

    case "UTILITY":
      return CircleDollarSign;

    case "SALARY":
      return WalletCards;

    default:
      return CalendarClock;
  }
}

function getNextOccurrenceLabel(
  transaction: RecurringTransaction,
): string {
  if (!transaction.is_active) {
    return "Paused";
  }

  return `Next: ${formatDate(
    transaction.next_occurrence,
  )}`;
}

export default function RecurringTransactionsPage() {
  const [
    recurringTransactions,
    setRecurringTransactions,
  ] = useState<RecurringTransaction[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    actionError,
    setActionError,
  ] = useState<string | null>(null);

  const [filter, setFilter] =
    useState<FilterType>("ALL");

  const [
    activeMenuId,
    setActiveMenuId,
  ] = useState<string | null>(null);

  const [
    actionId,
    setActionId,
  ] = useState<string | null>(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<RecurringTransaction | null>(
    null,
  );

  const [
    deleteError,
    setDeleteError,
  ] = useState<string | null>(null);

  async function loadRecurringTransactions() {
    try {
      setLoading(true);
      setError(null);

      const response =
        await getRecurringTransactions();

      setRecurringTransactions(
        response.items,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load recurring transactions.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecurringTransactions();
  }, []);

  const filteredTransactions =
    useMemo(() => {
      if (filter === "ALL") {
        return recurringTransactions;
      }

      return recurringTransactions.filter(
        (transaction) =>
          transaction.recurring_type ===
          filter,
      );
    }, [
      recurringTransactions,
      filter,
    ]);

  const activeCount =
    recurringTransactions.filter(
      (transaction) =>
        transaction.is_active,
    ).length;

  const monthlyExpenseAmount =
    recurringTransactions
      .filter(
        (transaction) =>
          transaction.is_active &&
          transaction.transaction_type ===
            "EXPENSE" &&
          transaction.frequency ===
            "MONTHLY",
      )
      .reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount),
        0,
      );

  async function handlePause(
    transaction: RecurringTransaction,
  ) {
    try {
      setActionId(transaction.id);
      setActionError(null);
      setActiveMenuId(null);

      const updated =
        await pauseRecurringTransaction(
          transaction.id,
        );

      setRecurringTransactions(
        (current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item,
          ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to pause recurring transaction.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleResume(
    transaction: RecurringTransaction,
  ) {
    try {
      setActionId(transaction.id);
      setActionError(null);
      setActiveMenuId(null);

      const updated =
        await resumeRecurringTransaction(
          transaction.id,
        );

      setRecurringTransactions(
        (current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item,
          ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to resume recurring transaction.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleGenerate(
    transaction: RecurringTransaction,
  ) {
    try {
      setActionId(transaction.id);
      setActionError(null);
      setActiveMenuId(null);

      const result =
        await generateRecurringTransaction(
          transaction.id,
        );

      setRecurringTransactions(
        (current) =>
          current.map((item) => {
            if (
              item.id !== transaction.id
            ) {
              return item;
            }

            return {
              ...item,
              next_occurrence:
                result.next_occurrence,
              last_generated_date:
                result.generated_transaction_date,
              is_active:
                result.is_active,
            };
          }),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to generate transaction.",
      );
    } finally {
      setActionId(null);
    }
  }

  function openDeleteModal(
    transaction: RecurringTransaction,
  ) {
    if (actionId) {
      return;
    }

    setDeleteError(null);
    setDeleteTarget(transaction);
    setActiveMenuId(null);
  }

  function closeDeleteModal() {
    if (actionId) {
      return;
    }

    setDeleteError(null);
    setDeleteTarget(null);
  }

  async function handleDelete() {
    if (
      !deleteTarget ||
      actionId
    ) {
      return;
    }

    try {
      setActionId(deleteTarget.id);
      setDeleteError(null);

      await deleteRecurringTransaction(
        deleteTarget.id,
      );

      setRecurringTransactions(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              deleteTarget.id,
          ),
      );

      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Unable to delete recurring transaction.",
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            PLANNED PAYMENTS
          </p>

          <h1>
            Recurring Transactions
          </h1>

          <p className={styles.subtitle}>
            Keep track of loans, SIPs, RDs,
            subscriptions and other recurring
            money movements.
          </p>
        </div>

        <Link
          href="/recurring-transactions/new"
          className={styles.addButton}
        >
          <Plus size={18} />
          Add Recurring
        </Link>
      </header>

      <section className={styles.summaryGrid}>
        <article
          className={styles.summaryCard}
        >
          <div
            className={styles.summaryIcon}
          >
            <RefreshCw size={18} />
          </div>

          <div>
            <div
              className={styles.summaryLabel}
            >
              Active Rules
            </div>

            <div
              className={styles.summaryValue}
            >
              {activeCount}
            </div>

            <div
              className={
                styles.summaryDescription
              }
            >
              Currently scheduled
            </div>
          </div>
        </article>

        <article
          className={styles.summaryCard}
        >
          <div
            className={styles.summaryIcon}
          >
            <CircleDollarSign size={18} />
          </div>

          <div>
            <div
              className={styles.summaryLabel}
            >
              Monthly Expenses
            </div>

            <div
              className={styles.summaryValue}
            >
              {formatCurrency(
                monthlyExpenseAmount,
              )}
            </div>

            <div
              className={
                styles.summaryDescription
              }
            >
              Active monthly commitments
            </div>
          </div>
        </article>

        <article
          className={styles.summaryCard}
        >
          <div
            className={styles.summaryIcon}
          >
            <CalendarClock size={18} />
          </div>

          <div>
            <div
              className={styles.summaryLabel}
            >
              Total Rules
            </div>

            <div
              className={styles.summaryValue}
            >
              {recurringTransactions.length}
            </div>

            <div
              className={
                styles.summaryDescription
              }
            >
              Active and paused
            </div>
          </div>
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <div>
            <p
              className={
                styles.sectionEyebrow
              }
            >
              RECURRING RULES
            </p>

            <h2>
              Your scheduled transactions
            </h2>
          </div>

          <div
            className={styles.filterWrapper}
          >
            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target
                    .value as FilterType,
                )
              }
              className={
                styles.filterSelect
              }
              aria-label="Filter recurring transactions"
            >
              <option value="ALL">
                All types
              </option>

              <option value="LOAN_EMI">
                Loan EMI
              </option>

              <option value="SIP">
                Mutual Fund / SIP
              </option>

              <option value="RD">
                Recurring Deposit
              </option>

              <option value="INSURANCE">
                Insurance
              </option>

              <option value="RENT">
                Rent
              </option>

              <option value="SUBSCRIPTION">
                Subscription
              </option>

              <option value="UTILITY">
                Utility
              </option>

              <option value="SALARY">
                Salary
              </option>

              <option value="OTHER">
                Other
              </option>
            </select>

            <ChevronDown
              size={16}
              className={styles.filterIcon}
            />
          </div>
        </div>

        {actionError && !loading && !error && (
          <div
            className={styles.actionError}
            role="alert"
          >
            <div>
              <strong>
                Action could not be completed
              </strong>

              <span>
                {actionError}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setActionError(null)
              }
              aria-label="Dismiss message"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div
            className={styles.emptyState}
          >
            <RefreshCw
              size={24}
              className={styles.spinner}
            />

            <strong>
              Loading recurring transactions
            </strong>

            <span>
              Fetching your scheduled payments.
            </span>
          </div>
        ) : error ? (
          <div
            className={styles.emptyState}
          >
            <strong>
              Unable to load recurring transactions
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              className={styles.emptyButton}
              onClick={() =>
                loadRecurringTransactions()
              }
            >
              Try Again
            </button>
          </div>
        ) : filteredTransactions.length ===
          0 ? (
          <div
            className={styles.emptyState}
          >
            <div
              className={styles.emptyIcon}
            >
              <CalendarClock size={28} />
            </div>

            <strong>
              No recurring transactions
            </strong>

            <span>
              Add your home loan, car loan,
              SIP, RD or another recurring
              payment.
            </span>

            <Link
              href="/recurring-transactions/new"
              className={styles.emptyButton}
            >
              <Plus size={17} />
              Add Recurring Transaction
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredTransactions.map(
              (transaction) => {
                const Icon = getTypeIcon(
                  transaction.recurring_type,
                );

                const isExpense =
                  transaction.transaction_type ===
                  "EXPENSE";

                const isProcessing =
                  actionId ===
                  transaction.id;

                return (
                  <article
                    key={transaction.id}
                    className={`${
                      styles.transactionCard
                    } ${
                      !transaction.is_active
                        ? styles.pausedCard
                        : ""
                    }`}
                  >
                    <div
                      className={
                        styles.transactionIcon
                      }
                    >
                      <Icon size={21} />
                    </div>

                    <div
                      className={
                        styles.transactionMain
                      }
                    >
                      <div
                        className={
                          styles.transactionHeader
                        }
                      >
                        <div>
                          <h3>
                            {transaction.name}
                          </h3>

                          <div
                            className={
                              styles.transactionMeta
                            }
                          >
                            <span>
                              {getRecurringTypeLabel(
                                transaction.recurring_type,
                              )}
                            </span>

                            <span>
                              •
                            </span>

                            <span>
                              {getFrequencyLabel(
                                transaction.frequency,
                              )}
                            </span>

                            <span>
                              •
                            </span>

                            <span>
                              {
                                transaction.account_name
                              }
                            </span>
                          </div>
                        </div>

                        <span
                          className={
                            transaction.is_active
                              ? styles.activeBadge
                              : styles.pausedBadge
                          }
                        >
                          {transaction.is_active
                            ? "Active"
                            : "Paused"}
                        </span>
                      </div>

                      <div
                        className={
                          styles.transactionDetails
                        }
                      >
                        <div>
                          <span
                            className={
                              styles.detailLabel
                            }
                          >
                            Amount
                          </span>

                          <strong
                            className={
                              isExpense
                                ? styles.expenseAmount
                                : styles.incomeAmount
                            }
                          >
                            {isExpense
                              ? "-"
                              : "+"}

                            {formatCurrency(
                              transaction.amount,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span
                            className={
                              styles.detailLabel
                            }
                          >
                            {transaction.is_active
                              ? "Next occurrence"
                              : "Schedule"}
                          </span>

                          <strong>
                            {getNextOccurrenceLabel(
                              transaction,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span
                            className={
                              styles.detailLabel
                            }
                          >
                            Category
                          </span>

                          <strong>
                            {transaction.category_name ||
                              "Uncategorized"}
                          </strong>
                        </div>
                      </div>

                      {transaction.last_generated_date && (
                        <div
                          className={
                            styles.lastGenerated
                          }
                        >
                          Last generated on{" "}
                          {formatDate(
                            transaction.last_generated_date,
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={
                        styles.actions
                      }
                    >
                      <Link
                        href={`/recurring-transactions/${transaction.id}/edit`}
                        className={
                          styles.editButton
                        }
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        className={
                          styles.moreButton
                        }
                        onClick={() =>
                          setActiveMenuId(
                            activeMenuId ===
                              transaction.id
                              ? null
                              : transaction.id,
                          )
                        }
                        aria-label={`Actions for ${transaction.name}`}
                        disabled={isProcessing}
                      >
                        <MoreHorizontal
                          size={19}
                        />
                      </button>

                      {activeMenuId ===
                        transaction.id && (
                        <div
                          className={
                            styles.actionMenu
                          }
                        >
                          {transaction.is_active ? (
                            <button
                              type="button"
                              onClick={() =>
                                handlePause(
                                  transaction,
                                )
                              }
                            >
                              <Pause
                                size={16}
                              />
                              Pause
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleResume(
                                  transaction,
                                )
                              }
                            >
                              <Play
                                size={16}
                              />
                              Resume
                            </button>
                          )}

                          {transaction.is_active && (
                            <button
                              type="button"
                              onClick={() =>
                                handleGenerate(
                                  transaction,
                                )
                              }
                            >
                              <RefreshCw
                                size={16}
                              />
                              Generate Now
                            </button>
                          )}

                          <button
                            type="button"
                            className={
                              styles.deleteAction
                            }
                            onClick={() =>
                              openDeleteModal(
                                transaction,
                              )
                            }
                          >
                            <Trash2
                              size={16}
                            />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      {deleteTarget && (
        <div
          className={
            styles.modalBackdrop
          }
          role="presentation"
          onMouseDown={closeDeleteModal}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-recurring-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.modalIcon
              }
            >
              <Trash2 size={21} />
            </div>

            <h2 id="delete-recurring-title">
              Delete recurring transaction?
            </h2>

            <p>
              This will remove the recurring
              rule for{" "}
              <strong>
                {deleteTarget.name}
              </strong>
              . Existing transactions will
              not be deleted.
            </p>

            {deleteError && (
              <div
                className={
                  styles.modalError
                }
              >
                {deleteError}
              </div>
            )}

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
                disabled={Boolean(
                  actionId,
                )}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.confirmDeleteButton
                }
                onClick={handleDelete}
                disabled={Boolean(
                  actionId,
                )}
              >
                {actionId
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}