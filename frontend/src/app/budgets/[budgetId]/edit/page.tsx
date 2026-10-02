"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  getBudget,
  updateBudget,
  type Budget,
  type UpdateBudgetPayload,
} from "@/lib/api/budgets";

import {
  getCategories,
  type Category,
} from "@/lib/api/categories";

import styles from "./edit-budget.module.scss";

type BudgetType = "CATEGORY" | "OVERALL";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function EditBudgetPage() {
  const params = useParams();
  const router = useRouter();

  const budgetId = params.budgetId as string;

  const [budget, setBudget] = useState<Budget | null>(
    null,
  );

  const [categories, setCategories] = useState<
    Category[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState<string | null>(
    null,
  );

  const [budgetType, setBudgetType] =
    useState<BudgetType>("CATEGORY");

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [monthStart, setMonthStart] = useState("");
  const [amount, setAmount] = useState("");
  const [warningPercentage, setWarningPercentage] =
    useState("80");

  const activeExpenseCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.category_type === "EXPENSE" &&
          category.is_active,
      ),
    [categories],
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

        if (cancelled) {
          return;
        }

        setBudget(response);

        setBudgetType(
          response.category_id
            ? "CATEGORY"
            : "OVERALL",
        );

        setName(response.name);

        setCategoryId(
          response.category_id ?? "",
        );

        setMonthStart(response.month_start);

        setAmount(response.amount);

        setWarningPercentage(
          response.warning_percentage,
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            getErrorMessage(err),
          );
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
    let cancelled = false;

    async function loadCategories() {
      try {
        setCategoriesLoading(true);

        const response =
          await getCategories("EXPENSE");

        if (!cancelled) {
          setCategories(response.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            `Unable to load expense categories. ${getErrorMessage(
              err,
            )}`,
          );
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleBudgetTypeChange(
    nextType: BudgetType,
  ) {
    setBudgetType(nextType);

    if (nextType === "OVERALL") {
      setCategoryId("");
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    const trimmedName = name.trim();
    const numericAmount = Number(amount);
    const numericWarning =
      Number(warningPercentage);

    if (!trimmedName) {
      setError("Please enter a budget name.");
      return;
    }

    if (!monthStart) {
      setError("Please select a budget month.");
      return;
    }

    if (
      budgetType === "CATEGORY" &&
      !categoryId
    ) {
      setError(
        "Please select an expense category.",
      );
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Budget amount must be greater than ₹0.",
      );
      return;
    }

    if (
      !Number.isFinite(numericWarning) ||
      numericWarning <= 0 ||
      numericWarning > 100
    ) {
      setError(
        "Warning threshold must be between 1% and 100%.",
      );
      return;
    }

    const payload: UpdateBudgetPayload = {
      category_id:
        budgetType === "CATEGORY"
          ? categoryId
          : null,
      name: trimmedName,
      month_start: monthStart,
      amount: numericAmount,
      warning_percentage: numericWarning,
    };

    try {
      setIsSubmitting(true);

      await updateBudget(
        budgetId,
        payload,
      );

      router.push(
        `/budgets?month=${encodeURIComponent(
          monthStart,
        )}`,
      );

      router.refresh();
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setIsSubmitting(false);
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

  if (!budget) {
    return (
      <main className={styles.page}>
        <div className={styles.errorPage}>
          <Link
            href="/budgets"
            className={styles.backLink}
          >
            <ArrowLeft size={17} />
            Back to Budgets
          </Link>

          <div className={styles.errorCard}>
            <h1>Unable to load budget</h1>

            <p>
              {error ??
                "The requested budget could not be found."}
            </p>

            <Link
              href="/budgets"
              className={styles.primaryButton}
            >
              Back to Budgets
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.backRow}>
        <Link
          href={`/budgets?month=${encodeURIComponent(
            budget.month_start,
          )}`}
          className={styles.backLink}
        >
          <ArrowLeft size={17} />
          Back to Budgets
        </Link>
      </div>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            SPENDING PLAN
          </p>

          <h1>Edit Budget</h1>

          <p className={styles.subtitle}>
            Update your monthly spending limit and
            budget settings.
          </p>
        </div>
      </header>

      <section className={styles.formCard}>
        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <div className={styles.sectionHeader}>
            <h2>Budget details</h2>

            <p>
              Update the details for this spending
              plan.
            </p>
          </div>

          <div className={styles.field}>
            <label htmlFor="budget-name">
              Budget name
            </label>

            <input
              id="budget-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. October Groceries"
              maxLength={100}
              autoComplete="off"
            />

            <span className={styles.helper}>
              Give your budget a name that is easy to
              recognize.
            </span>
          </div>

          <div className={styles.field}>
            <label>Budget type</label>

            <div className={styles.typeOptions}>
              <button
                type="button"
                className={`${styles.typeOption} ${
                  budgetType === "CATEGORY"
                    ? styles.typeOptionActive
                    : ""
                }`}
                onClick={() =>
                  handleBudgetTypeChange(
                    "CATEGORY",
                  )
                }
              >
                <span
                  className={styles.radio}
                  aria-hidden="true"
                >
                  {budgetType === "CATEGORY" && (
                    <span
                      className={styles.radioDot}
                    />
                  )}
                </span>

                <span>
                  <strong>
                    Category budget
                  </strong>

                  <small>
                    Track spending for one expense
                    category.
                  </small>
                </span>
              </button>

              <button
                type="button"
                className={`${styles.typeOption} ${
                  budgetType === "OVERALL"
                    ? styles.typeOptionActive
                    : ""
                }`}
                onClick={() =>
                  handleBudgetTypeChange(
                    "OVERALL",
                  )
                }
              >
                <span
                  className={styles.radio}
                  aria-hidden="true"
                >
                  {budgetType === "OVERALL" && (
                    <span
                      className={styles.radioDot}
                    />
                  )}
                </span>

                <span>
                  <strong>
                    Overall budget
                  </strong>

                  <small>
                    Track your total spending for
                    the month.
                  </small>
                </span>
              </button>
            </div>
          </div>

          {budgetType === "CATEGORY" && (
            <div className={styles.field}>
              <label htmlFor="category">
                Expense category
              </label>

              <div className={styles.selectWrapper}>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(
                      event.target.value,
                    )
                  }
                  disabled={categoriesLoading}
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories..."
                      : "Select a category"}
                  </option>

                  {activeExpenseCategories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown
                  size={18}
                  className={styles.selectIcon}
                />
              </div>

              {!categoriesLoading &&
                activeExpenseCategories.length ===
                  0 && (
                  <span
                    className={
                      styles.warningHelper
                    }
                  >
                    No active expense categories are
                    available.
                  </span>
                )}
            </div>
          )}

          <div className={styles.twoColumn}>
            <div className={styles.field}>
              <label htmlFor="month">
                Budget month
              </label>

              <input
                id="month"
                type="month"
                value={monthStart.slice(0, 7)}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  if (value) {
                    setMonthStart(
                      `${value}-01`,
                    );
                  }
                }}
              />

              <span className={styles.helper}>
                The budget applies to the entire
                selected month.
              </span>
            </div>

            <div className={styles.field}>
              <label htmlFor="amount">
                Monthly limit
              </label>

              <div className={styles.amountInput}>
                <span>₹</span>

                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value,
                    )
                  }
                  placeholder="15,000"
                  inputMode="decimal"
                />
              </div>

              <span className={styles.helper}>
                Enter the maximum amount you plan to
                spend.
              </span>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="warning">
              Warning threshold
            </label>

            <div className={styles.percentageInput}>
              <input
                id="warning"
                type="number"
                min="1"
                max="100"
                step="1"
                value={warningPercentage}
                onChange={(event) =>
                  setWarningPercentage(
                    event.target.value,
                  )
                }
                inputMode="numeric"
              />

              <span>%</span>
            </div>

            <span className={styles.helper}>
              Artha will mark the budget as a warning
              when spending reaches this percentage.
            </span>
          </div>

          {error && (
            <div
              className={styles.error}
              role="alert"
            >
              <strong>
                Unable to update budget
              </strong>

              <span>{error}</span>
            </div>
          )}

          <div className={styles.actions}>
            <Link
              href={`/budgets?month=${encodeURIComponent(
                budget.month_start,
              )}`}
              className={styles.cancelButton}
            >
              Cancel
            </Link>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={
                isSubmitting ||
                categoriesLoading
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    size={17}
                    className={styles.spinner}
                  />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}