"use client";

import {
  AlertTriangle,
  Building2,
  CreditCard,
  Landmark,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  deleteAccount,
  getAccounts,
  type Account,
} from "@/lib/api/accounts";

import styles from "./accounts.module.scss";

function formatCurrency(
  amount: string,
  currency = "INR"
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount));
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
  accountType: string
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

export default function AccountsPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>(
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    deletingAccountId,
    setDeletingAccountId,
  ] = useState<string | null>(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<Account | null>(null);

  const [
    deleteError,
    setDeleteError,
  ] = useState<string | null>(null);

  async function loadAccounts() {
    try {
      setLoading(true);
      setError(null);

      const data = await getAccounts();

      setAccounts(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load accounts."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getAccounts();

        if (!active) {
          return;
        }

        setAccounts(data);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load accounts."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const totalBalance = useMemo(() => {
    return accounts.reduce((total, account) => {
      const balance = Number(account.current_balance);

      if (account.account_type.toUpperCase() === "CREDIT_CARD") {
        return total - balance;
      }

      return total + balance;
    }, 0);
  }, [accounts]);

  function openDeleteModal(
    account: Account
  ) {
    if (deletingAccountId) {
      return;
    }

    setDeleteError(null);
    setDeleteTarget(account);
  }

  function closeDeleteModal() {
    if (deletingAccountId) {
      return;
    }

    setDeleteError(null);
    setDeleteTarget(null);
  }

  async function handleDelete() {
    if (
      !deleteTarget ||
      deletingAccountId
    ) {
      return;
    }

    try {
      setDeletingAccountId(
        deleteTarget.id
      );

      setDeleteError(null);

      await deleteAccount(
        deleteTarget.id
      );

      setAccounts(
        (currentAccounts) =>
          currentAccounts.filter(
            (item) =>
              item.id !==
              deleteTarget.id
          )
      );

      setDeleteTarget(null);
    } catch (err) {
      console.error(
        "Failed to delete account:",
        err
      );

      setDeleteError(
        err instanceof Error
          ? err.message
          : "Unable to delete this account."
      );
    } finally {
      setDeletingAccountId(null);
    }
  }

  return (
    <>
      <main className={styles.page}>
        <section className={styles.header}>
          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              FINANCIAL ACCOUNTS
            </p>

            <h1>Accounts</h1>

            <p
              className={
                styles.subtitle
              }
            >
              Manage your bank accounts,
              cash, cards and other
              financial accounts.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.addButton
            }
            onClick={() =>
              router.push("/accounts/new")
            }
          >
            <Plus
              size={18}
              strokeWidth={2}
            />

            Add Account
          </button>
        </section>

        {error && (
          <div
            className={styles.error}
          >
            <strong>
              Something went wrong
            </strong>

            <span>{error}</span>

            <button
              type="button"
              onClick={
                loadAccounts
              }
            >
              Try again
            </button>
          </div>
        )}

        <section
          className={
            styles.summaryGrid
          }
        >
          <div
            className={
              styles.summaryCard
            }
          >
            <div
              className={
                styles.summaryIcon
              }
            >
              <Wallet size={20} />
            </div>

            <div>
              <span>
                Net Account Balance
              </span>

              <strong>
                {formatCurrency(
                  String(totalBalance)
                )}
              </strong>
            </div>
          </div>

          <div
            className={
              styles.summaryCard
            }
          >
            <div
              className={
                styles.summaryIcon
              }
            >
              <Building2 size={20} />
            </div>

            <div>
              <span>
                Total Accounts
              </span>

              <strong>
                {accounts.length}
              </strong>
            </div>
          </div>
        </section>

        <section
          className={
            styles.accountsSection
          }
        >
          <div
            className={
              styles.sectionHeader
            }
          >
            <div>
              <h2>
                Your Accounts
              </h2>

              <p>
                All your connected
                financial accounts in
                one place.
              </p>
            </div>

            <span
              className={
                styles.accountCount
              }
            >
              {accounts.length}{" "}
              {accounts.length === 1
                ? "account"
                : "accounts"}
            </span>
          </div>

          {loading ? (
            <div
              className={
                styles.loadingState
              }
            >
              <div
                className={
                  styles.spinner
                }
              />

              <span>
                Loading accounts...
              </span>
            </div>
          ) : accounts.length ===
            0 ? (
            <div
              className={
                styles.emptyState
              }
            >
              <div
                className={
                  styles.emptyIcon
                }
              >
                <Wallet size={28} />
              </div>

              <h3>
                No accounts yet
              </h3>

              <p>
                Add your first bank
                account, cash account
                or credit card to
                start tracking your
                finances.
              </p>

              <button
                type="button"
                className={
                  styles.addButton
                }
                onClick={() =>
                  router.push("/accounts/new")
                }
              >
                <Plus size={18} />

                Add your first
                account
              </button>
            </div>
          ) : (
            <div
              className={
                styles.accountGrid
              }
            >
              {accounts.map(
                (account) => {
                  const Icon =
                    getAccountIcon(
                      account.account_type
                    );

                  const isDeleting =
                    deletingAccountId ===
                    account.id;

                  return (
                    <article
                      key={account.id}
                      className={styles.accountCard}
                      role="link"
                      tabIndex={isDeleting ? -1 : 0}
                      aria-label={`Open ${account.name} account details`}
                      onClick={() => {
                        if (!isDeleting) {
                          router.push(`/accounts/${account.id}`);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (
                          isDeleting ||
                          (event.key !== "Enter" &&
                            event.key !== " ")
                        ) {
                          return;
                        }

                        event.preventDefault();
                        router.push(`/accounts/${account.id}`);
                      }}
                    >
                      <div
                        className={
                          styles.cardTop
                        }
                      >
                        <div
                          className={
                            styles.accountIdentity
                          }
                        >
                          <div
                            className={
                              styles.accountIcon
                            }
                          >
                            <Icon
                              size={21}
                              strokeWidth={
                                1.8
                              }
                            />
                          </div>

                          <div>
                            <h3>
                              {
                                account.name
                              }
                            </h3>

                            <span>
                              {getAccountTypeLabel(
                                account.account_type
                              )}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={
                            styles.menuButton
                          }
                          aria-label={`Edit account ${account.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(
                              `/accounts/${account.id}/edit`
                            );
                          }}
                        >
                          <MoreHorizontal
                            size={20}
                          />
                        </button>
                      </div>

                      <div
                        className={
                          styles.institution
                        }
                      >
                        <span>
                          {account.institution_name ??
                            "Personal Account"}
                        </span>

                        {account.account_number_last4 && (
                          <span>
                            ••••{" "}
                            {
                              account.account_number_last4
                            }
                          </span>
                        )}
                      </div>

                      <div
                        className={
                          styles.balanceBlock
                        }
                      >
                        <span>
                          Current Balance
                        </span>

                        <strong>
                          {formatCurrency(
                            account.current_balance,
                            account.currency
                          )}
                        </strong>
                      </div>

                      <div
                        className={
                          styles.cardFooter
                        }
                      >
                        <div>
                          <span>
                            Opening Balance
                          </span>

                          <strong>
                            {formatCurrency(
                              account.opening_balance,
                              account.currency
                            )}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className={
                            styles.deleteButton
                          }
                          disabled={
                            isDeleting
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            openDeleteModal(account);
                          }}
                        >
                          <Trash2
                            size={14}
                          />

                          {isDeleting
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>

      {/* ------------------------------------------------ */}
      {/* Delete Account Modal */}
      {/* ------------------------------------------------ */}

      {deleteTarget && (
        <div
          className={
            styles.modalOverlay
          }
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
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-description"
          >
            <button
              type="button"
              className={
                styles.modalCloseButton
              }
              onClick={
                closeDeleteModal
              }
              disabled={
                Boolean(
                  deletingAccountId
                )
              }
              aria-label="Close delete confirmation"
            >
              <X size={18} />
            </button>

            <div
              className={
                styles.modalIcon
              }
            >
              <AlertTriangle
                size={22}
                strokeWidth={2}
              />
            </div>

            <div
              className={
                styles.modalContent
              }
            >
              <h2 id="delete-account-title">
                Delete account?
              </h2>

              <p id="delete-account-description">
                You are about to
                permanently delete this
                account from Artha.
              </p>

              <div
                className={
                  styles.deletePreview
                }
              >
                <div>
                  <span>
                    Account
                  </span>

                  <strong>
                    {
                      deleteTarget.name
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Current Balance
                  </span>

                  <strong>
                    {formatCurrency(
                      deleteTarget.current_balance,
                      deleteTarget.currency
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Account Type
                  </span>

                  <strong>
                    {getAccountTypeLabel(
                      deleteTarget.account_type
                    )}
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.warning
                }
              >
                <AlertTriangle
                  size={16}
                />

                <span>
                  Accounts with existing
                  transactions cannot be
                  deleted. Remove or
                  reassign those
                  transactions first.
                </span>
              </div>

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
                  disabled={
                    Boolean(
                      deletingAccountId
                    )
                  }
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
                  disabled={
                    Boolean(
                      deletingAccountId
                    )
                  }
                >
                  {deletingAccountId ? (
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

                      Delete Account
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