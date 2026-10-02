"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CreditCard,
  Landmark,
  Loader2,
  Pencil,
  ReceiptText,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  deleteAccount,
  getAccount,
  type Account,
} from "@/lib/api/accounts";

import {
  getCategories,
  type Category,
} from "@/lib/api/categories";

import { getTransactions } from "@/lib/api/transactions";

import type { Transaction } from "@/types/transaction";

import styles from "./account-details.module.scss";

type AccountDetailsPageProps = {
  params: Promise<{
    accountId: string;
  }>;
};

function formatCurrency(
  amount: string | number,
  currency = "INR",
): string {
  const numericAmount =
    typeof amount === "string"
      ? Number(amount)
      : amount;

  if (!Number.isFinite(numericAmount)) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(0);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function formatTransactionDate(
  transactionDate: string,
): string {
  const date = new Date(transactionDate);

  if (Number.isNaN(date.getTime())) {
    return transactionDate;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getAccountIcon(accountType: string) {
  switch (accountType.toUpperCase()) {
    case "BANK":
      return Landmark;

    case "CREDIT_CARD":
      return CreditCard;

    case "CASH":
      return Wallet;

    default:
      return Building2;
  }
}

function getAccountTypeLabel(
  accountType: string,
): string {
  switch (accountType.toUpperCase()) {
    case "BANK":
      return "Bank Account";

    case "CREDIT_CARD":
      return "Credit Card";

    case "CASH":
      return "Cash";

    case "INVESTMENT":
      return "Investment";

    default:
      return accountType;
  }
}

type AccountTypeIconProps = {
  accountType: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

function AccountTypeIcon({
  accountType,
  ...props
}: AccountTypeIconProps) {
  const Icon = getAccountIcon(accountType);

  return <Icon {...props} />;
}

function getTransactionTitle(
  transaction: Transaction,
): string {
  return (
    transaction.merchant ||
    transaction.description ||
    "Transaction"
  );
}

function getCategoryName(
  transaction: Transaction,
  categories: Category[],
): string {
  if (!transaction.category_id) {
    return "Uncategorized";
  }

  const category = categories.find(
    (item) =>
      item.id === transaction.category_id,
  );

  return category?.name || "Uncategorized";
}

export default function AccountDetailsPage({
  params,
}: AccountDetailsPageProps) {
  const router = useRouter();

  const [accountId, setAccountId] =
    useState<string | null>(null);

  const [account, setAccount] =
    useState<Account | null>(null);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    loadingTransactions,
    setLoadingTransactions,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    transactionError,
    setTransactionError,
  ] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState<string | null>(null);

  const [deleting, setDeleting] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      try {
        const resolvedParams = await params;

        if (!mounted) {
          return;
        }

        const resolvedAccountId =
          resolvedParams.accountId;

        setAccountId(resolvedAccountId);

        const accountData =
          await getAccount(resolvedAccountId);

        if (!mounted) {
          return;
        }

        setAccount(accountData);

        /*
         * Load transactions for this account.
         */
        setLoadingTransactions(true);
        setTransactionError(null);

        try {
          const transactionResponse =
            await getTransactions({
              accountId: resolvedAccountId,
            });

          if (!mounted) {
            return;
          }

          setTransactions(
            transactionResponse.items,
          );
        } catch (err) {
          if (!mounted) {
            return;
          }

          setTransactionError(
            err instanceof Error
              ? err.message
              : "Unable to load transaction history.",
          );
        } finally {
          if (mounted) {
            setLoadingTransactions(false);
          }
        }

        /*
         * Load categories so category IDs can be
         * displayed as readable category names.
         */
        try {
          const categoryResponse =
            await getCategories();

          if (!mounted) {
            return;
          }

          setCategories(
            categoryResponse.items,
          );
        } catch (err) {
          /*
           * Category loading should not prevent
           * transaction history from displaying.
           */
          console.error(
            "Failed to load categories:",
            err,
          );
        }
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load account details.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      mounted = false;
    };
  }, [params]);

  function handleEdit() {
    if (!accountId) {
      return;
    }

    router.push(`/accounts/${accountId}/edit`);
  }

  function openDeleteModal() {
    setDeleteError(null);
    setDeleteOpen(true);
  }

  function closeDeleteModal() {
    if (deleting) {
      return;
    }

    setDeleteOpen(false);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!accountId || !account) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteError(null);

      await deleteAccount(accountId);

      router.push("/accounts");
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Unable to delete this account.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingState}>
          <Loader2
            className={styles.spinner}
            size={24}
          />

          <span>Loading account...</span>
        </div>
      </main>
    );
  }

  if (error || !account) {
    return (
      <main className={styles.page}>
        <Link
          href="/accounts"
          className={styles.backLink}
        >
          <ArrowLeft size={17} />
          Back to Accounts
        </Link>

        <section className={styles.errorCard}>
          <h1>Unable to load account</h1>

          <p>
            {error ??
              "The requested account could not be found."}
          </p>

          <Link
            href="/accounts"
            className={styles.primaryButton}
          >
            Back to Accounts
          </Link>
        </section>
      </main>
    );
  }

  const formattedCurrentBalance =
    formatCurrency(
      account.current_balance,
      account.currency,
    );

  const formattedOpeningBalance =
    formatCurrency(
      account.opening_balance,
      account.currency,
    );

  return (
    <>
      <main className={styles.page}>
        {/* -------------------------------------------- */}
        {/* Top navigation */}
        {/* -------------------------------------------- */}

        <div className={styles.topBar}>
          <Link
            href="/accounts"
            className={styles.backLink}
          >
            <ArrowLeft size={17} />
            Back to Accounts
          </Link>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleEdit}
            >
              <Pencil size={17} />
              Edit Account
            </button>

            <button
              type="button"
              className={styles.dangerButton}
              onClick={openDeleteModal}
            >
              <Trash2 size={17} />
              Delete
            </button>
          </div>
        </div>

        {/* -------------------------------------------- */}
        {/* Account header */}
        {/* -------------------------------------------- */}

        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <AccountTypeIcon
              accountType={account.account_type}
              size={30}
              strokeWidth={1.8}
            />
          </div>

          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>
              ACCOUNT DETAILS
            </p>

            <h1>{account.name}</h1>

            <div className={styles.headerMeta}>
              <span className={styles.typeBadge}>
                {getAccountTypeLabel(
                  account.account_type,
                )}
              </span>

              {account.institution_name && (
                <span className={styles.metaText}>
                  {account.institution_name}
                </span>
              )}

              {account.account_number_last4 && (
                <span className={styles.metaText}>
                  ••••{" "}
                  {account.account_number_last4}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* -------------------------------------------- */}
        {/* Current balance */}
        {/* -------------------------------------------- */}

        <section className={styles.balanceCard}>
          <div>
            <p className={styles.balanceLabel}>
              Current Balance
            </p>

            <p className={styles.balanceAmount}>
              {formattedCurrentBalance}
            </p>
          </div>

          <div
            className={styles.balanceDecoration}
          >
            <AccountTypeIcon
              accountType={account.account_type}
              size={42}
              strokeWidth={1.4}
            />
          </div>
        </section>

        {/* -------------------------------------------- */}
        {/* Account information */}
        {/* -------------------------------------------- */}

        <section className={styles.detailsGrid}>
          <article className={styles.detailsCard}>
            <div className={styles.cardHeader}>
              <h2>Account Information</h2>
            </div>

            <div className={styles.detailList}>
              <div className={styles.detailRow}>
                <span>Account name</span>

                <strong>
                  {account.name}
                </strong>
              </div>

              <div className={styles.detailRow}>
                <span>Account type</span>

                <strong>
                  {getAccountTypeLabel(
                    account.account_type,
                  )}
                </strong>
              </div>

              <div className={styles.detailRow}>
                <span>Institution</span>

                <strong>
                  {account.institution_name ||
                    "Not provided"}
                </strong>
              </div>

              <div className={styles.detailRow}>
                <span>Account number</span>

                <strong>
                  {account.account_number_last4
                    ? `•••• ${account.account_number_last4}`
                    : "Not provided"}
                </strong>
              </div>

              <div className={styles.detailRow}>
                <span>Currency</span>

                <strong>
                  {account.currency}
                </strong>
              </div>
            </div>
          </article>

          <article className={styles.detailsCard}>
            <div className={styles.cardHeader}>
              <h2>Balance Information</h2>
            </div>

            <div className={styles.detailList}>
              <div className={styles.detailRow}>
                <span>Opening balance</span>

                <strong>
                  {formattedOpeningBalance}
                </strong>
              </div>

              <div className={styles.detailRow}>
                <span>Current balance</span>

                <strong
                  className={
                    styles.currentBalance
                  }
                >
                  {formattedCurrentBalance}
                </strong>
              </div>
            </div>
          </article>
        </section>

        {/* -------------------------------------------- */}
        {/* Transaction history */}
        {/* -------------------------------------------- */}

        <section
          className={styles.transactionCard}
        >
          <div className={styles.cardHeader}>
            <div>
              <h2>Transaction History</h2>

              <p>
                Transactions recorded against this
                account.
              </p>
            </div>

            <Link
              href={`/transactions?account_id=${account.id}`}
              className={styles.viewAllButton}
            >
              View all
              <ArrowRight size={16} />
            </Link>
          </div>

          {loadingTransactions ? (
            <div
              className={
                styles.transactionLoading
              }
            >
              <Loader2
                size={20}
                className={styles.spinner}
              />

              <span>
                Loading transactions...
              </span>
            </div>
          ) : transactionError ? (
            <div
              className={
                styles.transactionError
              }
            >
              <strong>
                Unable to load transaction history
              </strong>

              <span>
                {transactionError}
              </span>
            </div>
          ) : transactions.length === 0 ? (
            <div
              className={
                styles.transactionEmpty
              }
            >
              <div
                className={
                  styles.transactionEmptyIcon
                }
              >
                <ReceiptText size={23} />
              </div>

              <strong>
                No transactions yet
              </strong>

              <span>
                Transactions recorded against{" "}
                {account.name} will appear here.
              </span>

              <Link
                href={`/transactions/new?account_id=${account.id}`}
                className={
                  styles.emptyTransactionButton
                }
              >
                Add Transaction
              </Link>
            </div>
          ) : (
            <div
              className={
                styles.transactionList
              }
            >
              {transactions.map(
                (transaction) => {
                  const isExpense =
                    transaction.transaction_type ===
                    "EXPENSE";

                  const title =
                    getTransactionTitle(
                      transaction,
                    );

                  const categoryName =
                    getCategoryName(
                      transaction,
                      categories,
                    );

                  return (
                    <Link
                      key={transaction.id}
                      href={`/transactions/${transaction.id}`}
                      className={
                        styles.transactionRow
                      }
                    >
                      <div
                        className={`${styles.transactionIcon} ${
                          isExpense
                            ? styles.transactionExpenseIcon
                            : styles.transactionIncomeIcon
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
                          styles.transactionInfo
                        }
                      >
                        <strong>
                          {title}
                        </strong>

                        <span>
                          {categoryName}
                          {" · "}
                          {formatTransactionDate(
                            transaction.transaction_date,
                          )}
                        </span>

                        {transaction.description &&
                          transaction.merchant && (
                            <small>
                              {
                                transaction.description
                              }
                            </small>
                          )}
                      </div>

                      <div
                        className={
                          styles.transactionAmountWrapper
                        }
                      >
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
                            account.currency,
                          )}
                        </strong>

                        <ArrowRight
                          size={16}
                          className={
                            styles.transactionArrow
                          }
                        />
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* -------------------------------------------- */}
        {/* Notes */}
        {/* -------------------------------------------- */}

        <section className={styles.notesCard}>
          <div className={styles.cardHeader}>
            <h2>Notes</h2>
          </div>

          <p
            className={
              account.notes
                ? styles.notes
                : styles.mutedNotes
            }
          >
            {account.notes ||
              "No notes have been added for this account."}
          </p>
        </section>
      </main>

      {/* ---------------------------------------------- */}
      {/* Delete confirmation modal */}
      {/* ---------------------------------------------- */}

      {deleteOpen && (
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
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={closeDeleteModal}
              aria-label="Close delete confirmation"
              disabled={deleting}
            >
              <X size={19} />
            </button>

            <div className={styles.modalIcon}>
              <Trash2 size={22} />
            </div>

            <div
              className={styles.modalContent}
            >
              <p
                className={
                  styles.modalEyebrow
                }
              >
                DELETE ACCOUNT
              </p>

              <h2 id="delete-account-title">
                Delete {account.name}?
              </h2>

              <p>
                This action will permanently
                remove this account. Accounts with
                existing transactions cannot be
                deleted.
              </p>
            </div>

            <div
              className={
                styles.accountPreview
              }
            >
              <div
                className={styles.previewIcon}
              >
                <AccountTypeIcon
                  accountType={account.account_type}
                  size={19}
                />
              </div>

              <div>
                <strong>
                  {account.name}
                </strong>

                <span>
                  {getAccountTypeLabel(
                    account.account_type,
                  )}
                </span>
              </div>
            </div>

            {deleteError && (
              <div
                className={styles.deleteError}
              >
                {deleteError}
              </div>
            )}

            <div
              className={styles.modalActions}
            >
              <button
                type="button"
                className={styles.cancelButton}
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.confirmDeleteButton
                }
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
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
                    <Trash2 size={16} />

                    Delete Account
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}