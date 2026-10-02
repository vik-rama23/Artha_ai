"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleX,
  Edit3,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  deleteBudget,
  getBudget,
  type Budget,
} from "@/lib/api/budgets";

import styles from "./budget-details.module.scss";

function formatCurrency(value: string | number): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonth(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getProgressPercentage(budget: Budget): number {
  const percentage = Number(budget.percentage_used);

  if (!Number.isFinite(percentage)) {
    return 0;
  }

  return Math.min(Math.max(percentage, 0), 100);
}

function getStatusLabel(status: Budget["status"]): string {
  switch (status) {
    case "WARNING":
      return "Warning";
    case "EXCEEDED":
      return "Exceeded";
    default:
      return "On Track";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function BudgetDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const budgetId = params.budgetId as string;

  const [budget, setBudget] = useState<Budget | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!budgetId) {
      return;
    }

    let cancelled = false;

    async function loadBudget() {
      try {
        setLoading(true);
        setError(null);

        const response = await getBudget(budgetId);

        if (!cancelled) {
          setBudget(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBudget();

    return () => {
      cancelled = true;
    };
  }, [budgetId]);

  useEffect(() => {
    if (!showDeleteModal || deleting) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowDeleteModal(false);
        setDeleteError(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [showDeleteModal, deleting]);

  function openDeleteModal() {
    setDeleteError(null);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    if (deleting) {
      return;
    }

    setDeleteError(null);
    setShowDeleteModal(false);
  }

  async function handleDelete() {
    if (!budget || deleting) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteError(null);

      await deleteBudget(budget.id);

      setShowDeleteModal(false);

      router.push(
        `/budgets?month=${encodeURIComponent(
          budget.month_start,
        )}`,
      );

      router.refresh();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingState}>
          <Loader2
            size={22}
            className={styles.spinner}
          />
          <span>Loading budget...</span>
        </div>
      </main>
    );
  }

  if (error || !budget) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <Link
            href="/budgets"
            className={styles.backLink}
          >
            <ArrowLeft size={17} />
            Back to Budgets
          </Link>

          <section className={styles.errorCard}>
            <div className={styles.errorIcon}>
              <CircleX size={24} />
            </div>

            <div>
              <h1>Unable to load budget</h1>

              <p>
                {error ??
                  "The requested budget could not be found."}
              </p>
            </div>

            <Link
              href="/budgets"
              className={styles.primaryButton}
            >
              Back to Budgets
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const progress = getProgressPercentage(budget);
  const spent = Number(budget.spent);
  const amount = Number(budget.amount);
  const remaining = Number(budget.remaining);
  const percentageUsed = Number(
    budget.percentage_used,
  );
  const warningPercentage = Number(
    budget.warning_percentage,
  );

  const isExceeded = budget.status === "EXCEEDED";
  const isWarning = budget.status === "WARNING";

  const budgetDisplayName =
    budget.category_name || budget.name;

  return (
    <>
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.topBar}>
            <Link
              href={`/budgets?month=${encodeURIComponent(
                budget.month_start,
              )}`}
              className={styles.backLink}
            >
              <ArrowLeft size={17} />
              Back to Budgets
            </Link>

            <div className={styles.actions}>
              <Link
                href={`/budgets/${budget.id}/edit`}
                className={styles.editButton}
              >
                <Edit3 size={16} />
                Edit Budget
              </Link>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={openDeleteModal}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>

          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>
                BUDGET DETAILS
              </p>

              <h1>{budgetDisplayName}</h1>

              <p className={styles.subtitle}>
                {budget.category_name
                  ? "Monthly category budget"
                  : "Overall monthly budget"}
              </p>
            </div>

            <div
              className={`${styles.statusBadge} ${
                isExceeded
                  ? styles.statusExceeded
                  : isWarning
                    ? styles.statusWarning
                    : styles.statusOnTrack
              }`}
            >
              {isExceeded ? (
                <CircleX size={17} />
              ) : isWarning ? (
                <CircleAlert size={17} />
              ) : (
                <CircleCheck size={17} />
              )}

              {getStatusLabel(budget.status)}
            </div>
          </header>

          <section className={styles.heroCard}>
            <div className={styles.heroTop}>
              <div>
                <span className={styles.heroLabel}>
                  Monthly spending
                </span>

                <div className={styles.heroAmount}>
                  {formatCurrency(spent)}
                  <span>
                    {" "}
                    / {formatCurrency(amount)}
                  </span>
                </div>
              </div>

              <div className={styles.heroPercentage}>
                {percentageUsed.toFixed(0)}%
                <span>used</span>
              </div>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressBar} ${
                  isExceeded
                    ? styles.progressExceeded
                    : isWarning
                      ? styles.progressWarning
                      : styles.progressOnTrack
                }`}
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <div className={styles.progressFooter}>
              <span>
                {remaining >= 0
                  ? `${formatCurrency(
                      remaining,
                    )} remaining`
                  : `${formatCurrency(
                      Math.abs(remaining),
                    )} over budget`}
              </span>

              <span>
                Warning at{" "}
                {warningPercentage.toFixed(0)}%
              </span>
            </div>
          </section>

          <section className={styles.statsGrid}>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>
                Budget Limit
              </span>

              <strong className={styles.statValue}>
                {formatCurrency(amount)}
              </strong>

              <span className={styles.statDescription}>
                Maximum planned spending
              </span>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statLabel}>
                Spent
              </span>

              <strong className={styles.statValue}>
                {formatCurrency(spent)}
              </strong>

              <span className={styles.statDescription}>
                Actual expenses recorded
              </span>
            </article>

            <article className={styles.statCard}>
              <span className={styles.statLabel}>
                Remaining
              </span>

              <strong
                className={`${styles.statValue} ${
                  remaining < 0
                    ? styles.negativeValue
                    : ""
                }`}
              >
                {formatCurrency(
                  Math.abs(remaining),
                )}
              </strong>

              <span className={styles.statDescription}>
                {remaining < 0
                  ? "Amount over budget"
                  : "Available to spend"}
              </span>
            </article>
          </section>

          <section className={styles.detailsGrid}>
            <article className={styles.detailCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <CalendarDays size={19} />
                </div>

                <div>
                  <h2>Budget period</h2>
                  <p>
                    The month covered by this budget.
                  </p>
                </div>
              </div>

              <div className={styles.detailRows}>
                <div className={styles.detailRow}>
                  <span>Month</span>

                  <strong>
                    {formatMonth(
                      budget.month_start,
                    )}
                  </strong>
                </div>

                <div className={styles.detailRow}>
                  <span>Start date</span>

                  <strong>
                    {formatDate(
                      budget.month_start,
                    )}
                  </strong>
                </div>

                <div className={styles.detailRow}>
                  <span>End date</span>

                  <strong>
                    {formatDate(
                      budget.month_end,
                    )}
                  </strong>
                </div>
              </div>
            </article>

            <article className={styles.detailCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  {budget.category_name ? (
                    <span
                      className={
                        styles.categoryMark
                      }
                    >
                      C
                    </span>
                  ) : (
                    <span
                      className={
                        styles.categoryMark
                      }
                    >
                      A
                    </span>
                  )}
                </div>

                <div>
                  <h2>Budget type</h2>
                  <p>
                    How this budget tracks your
                    spending.
                  </p>
                </div>
              </div>

              <div className={styles.detailRows}>
                <div className={styles.detailRow}>
                  <span>Type</span>

                  <strong>
                    {budget.category_name
                      ? "Category budget"
                      : "Overall budget"}
                  </strong>
                </div>

                {budget.category_name && (
                  <div className={styles.detailRow}>
                    <span>Category</span>

                    <strong>
                      {budget.category_name}
                    </strong>
                  </div>
                )}

                <div className={styles.detailRow}>
                  <span>Warning threshold</span>

                  <strong>
                    {warningPercentage.toFixed(0)}%
                  </strong>
                </div>
              </div>
            </article>
          </section>

          <section className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <CircleCheck size={18} />
            </div>

            <div>
              <strong>
                Budget tracking is based on actual
                transactions
              </strong>

              <p>
                Your spent amount and remaining
                balance update as transactions are
                added, edited, or removed during this
                budget month.
              </p>
            </div>
          </section>
        </div>
      </main>

      {showDeleteModal && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-budget-title"
            aria-describedby="delete-budget-description"
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={closeDeleteModal}
              disabled={deleting}
              aria-label="Close delete confirmation"
            >
              <X size={19} />
            </button>

            <div className={styles.modalIcon}>
              <Trash2 size={21} />
            </div>

            <h2 id="delete-budget-title">
              Delete budget?
            </h2>

            <p id="delete-budget-description">
              Are you sure you want to delete{" "}
              <strong>
                {budgetDisplayName}
              </strong>{" "}
              for{" "}
              <strong>
                {formatMonth(
                  budget.month_start,
                )}
              </strong>
              ?
            </p>

            <span className={styles.modalWarning}>
              This action cannot be undone.
            </span>

            {deleteError && (
              <div
                className={styles.modalError}
                role="alert"
              >
                <CircleAlert size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.modalDelete}
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2
                      size={16}
                      className={styles.spinner}
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Budget
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}