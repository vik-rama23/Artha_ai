"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
    createBudget,
    type CreateBudgetPayload,
} from "@/lib/api/budgets";
import {
    getCategories,
    type Category,
} from "@/lib/api/categories";

import styles from "./new-budget.module.scss";

type BudgetType = "CATEGORY" | "OVERALL";

function getCurrentMonth(): string {
    const now = new Date();

    return `${now.getFullYear()}-${String(
        now.getMonth() + 1,
    ).padStart(2, "0")}-01`;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "Unable to create budget. Please try again.";
}

export default function NewBudgetPage() {
    const router = useRouter();

    const [budgetType, setBudgetType] =
        useState<BudgetType>("CATEGORY");

    const [categories, setCategories] = useState<Category[]>([]);
    const [categoriesLoading, setCategoriesLoading] =
        useState(true);

    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [monthStart, setMonthStart] =
        useState(getCurrentMonth());
    const [amount, setAmount] = useState("");
    const [warningPercentage, setWarningPercentage] =
        useState("80");

    const [isSubmitting, setIsSubmitting] =
        useState(false);
    const [error, setError] = useState<string | null>(
        null,
    );

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
        let cancelled = false;

        async function loadCategories() {
            try {
                setCategoriesLoading(true);
                setError(null);

                const response = await getCategories("EXPENSE");

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

        loadCategories();

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
        const numericWarning = Number(
            warningPercentage,
        );

        if (!trimmedName) {
            setError("Please enter a budget name.");
            return;
        }

        if (
            budgetType === "CATEGORY" &&
            !categoryId
        ) {
            setError("Please select an expense category.");
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

        const payload: CreateBudgetPayload = {
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

            await createBudget(payload);

            router.push(
                `/budgets?month=${encodeURIComponent(
                    monthStart,
                )}`,
            );
            router.refresh();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.backRow}>
                <Link
                    href="/budgets"
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

                    <h1>Add Budget</h1>

                    <p className={styles.subtitle}>
                        Set a monthly spending limit and keep your
                        expenses under control.
                    </p>
                </div>
            </header>

            <section className={styles.formCard}>
                <form
                    className={styles.form}
                    onSubmit={handleSubmit}
                >
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>Budget details</h2>

                            <p>
                                Define how much you want to spend for
                                the selected month.
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
                                    className={`${styles.typeOption} ${budgetType === "CATEGORY"
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
                                    className={`${styles.typeOption} ${budgetType === "OVERALL"
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
                                            Track your total spending for the
                                            month.
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
                    </div>

                    {error && (
                        <div
                            className={styles.error}
                            role="alert"
                        >
                            <strong>Unable to create budget</strong>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <Link
                            href="/budgets"
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
                                    Creating...
                                </>
                            ) : (
                                "Create Budget"
                            )}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}