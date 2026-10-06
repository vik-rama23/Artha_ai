"use client";

import {
    FormEvent,
    useState,
} from "react";
import {
    CalendarDays,
    Loader2,
    Pencil,
    Plus,
    Save,
    Trash2,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
    createGoalContribution,
    deleteGoal,
    updateGoal,
} from "@/lib/api/goals";

import type { GoalDetail } from "@/types/goal";

import styles from "./page.module.scss";

type GoalDetailsClientProps = {
    goal: GoalDetail;
};

type GoalIcon =
    | "target"
    | "shield"
    | "trending"
    | "wallet"
    | "calendar";

function getToday(): string {
    const now =
        new Date();

    return `${now.getFullYear()}-${String(
        now.getMonth() + 1,
    ).padStart(2, "0")}-${String(
        now.getDate(),
    ).padStart(2, "0")}`;
}

function getErrorMessage(
    error: unknown,
): string {
    if (
        error instanceof Error &&
        error.message
    ) {
        return error.message;
    }

    return "Something went wrong. Please try again.";
}

export default function GoalDetailsClient({
    goal,
}: GoalDetailsClientProps) {
    const router =
        useRouter();

    /* ==========================================================
       CONTRIBUTION STATE
       ========================================================== */

    const [
        showContributionForm,
        setShowContributionForm,
    ] = useState(false);

    const [
        contributionAmount,
        setContributionAmount,
    ] = useState("");

    const [
        contributionDate,
        setContributionDate,
    ] = useState(getToday());

    const [
        contributionNotes,
        setContributionNotes,
    ] = useState("");

    /* ==========================================================
       EDIT STATE
       ========================================================== */

    const [
        showEditForm,
        setShowEditForm,
    ] = useState(false);

    const [
        editName,
        setEditName,
    ] = useState(goal.name);

    const [
        editDescription,
        setEditDescription,
    ] = useState(
        goal.description ?? "",
    );

    const [
        editTargetAmount,
        setEditTargetAmount,
    ] = useState(
        goal.target_amount,
    );

    const [
        editTargetDate,
        setEditTargetDate,
    ] = useState(
        goal.target_date ?? "",
    );

    const [
        editIcon,
        setEditIcon,
    ] = useState<GoalIcon>(
        (goal.icon as GoalIcon) ??
        "target",
    );

    /* ==========================================================
       GENERAL STATE
       ========================================================== */

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        isDeleting,
        setIsDeleting,
    ] = useState(false);

    const [
        isUpdating,
        setIsUpdating,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    );

    const remaining =
        Math.max(
            0,
            Number(
                goal.target_amount,
            ) -
            Number(
                goal.current_amount,
            ),
        );

    /* ==========================================================
       OPEN EDIT FORM
       ========================================================== */

    function handleOpenEdit() {
        setError(null);

        setEditName(
            goal.name,
        );

        setEditDescription(
            goal.description ?? "",
        );

        setEditTargetAmount(
            goal.target_amount,
        );

        setEditTargetDate(
            goal.target_date ?? "",
        );

        setEditIcon(
            (goal.icon as GoalIcon) ??
            "target",
        );

        setShowEditForm(
            true,
        );
    }

    /* ==========================================================
       UPDATE GOAL
       ========================================================== */

    async function handleEditSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError(null);

        const trimmedName =
            editName.trim();

        const trimmedDescription =
            editDescription.trim();

        const numericTarget =
            Number(
                editTargetAmount,
            );

        const currentAmount =
            Number(
                goal.current_amount,
            );

        if (!trimmedName) {
            setError(
                "Please enter a goal name.",
            );
            return;
        }

        if (
            !Number.isFinite(
                numericTarget,
            ) ||
            numericTarget <= 0
        ) {
            setError(
                "Target amount must be greater than ₹0.",
            );
            return;
        }

        if (
            currentAmount >
            numericTarget
        ) {
            setError(
                "Target amount cannot be less than the amount already saved.",
            );
            return;
        }

        try {
            setIsUpdating(
                true,
            );

            await updateGoal(
                goal.id,
                {
                    name:
                        trimmedName,
                    description:
                        trimmedDescription ||
                        null,
                    target_amount:
                        numericTarget.toFixed(
                            2,
                        ),
                    target_date:
                        editTargetDate ||
                        null,
                    icon:
                        editIcon,
                },
            );

            setShowEditForm(
                false,
            );

            router.refresh();
        } catch (err) {
            setError(
                getErrorMessage(err),
            );
        } finally {
            setIsUpdating(
                false,
            );
        }
    }

    /* ==========================================================
       ADD CONTRIBUTION
       ========================================================== */

    async function handleContributionSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError(null);

        const amount =
            Number(
                contributionAmount,
            );

        if (
            !Number.isFinite(
                amount,
            ) ||
            amount <= 0
        ) {
            setError(
                "Contribution amount must be greater than ₹0.",
            );
            return;
        }

        if (amount > remaining) {
            setError(
                "Contribution cannot be greater than the remaining goal amount.",
            );
            return;
        }

        if (!contributionDate) {
            setError(
                "Please select a contribution date.",
            );
            return;
        }

        try {
            setIsSubmitting(
                true,
            );

            await createGoalContribution(
                goal.id,
                {
                    amount:
                        amount.toFixed(2),
                    contribution_date:
                        contributionDate,
                    notes:
                        contributionNotes.trim() ||
                        null,
                },
            );

            setContributionAmount(
                "",
            );

            setContributionNotes(
                "",
            );

            setContributionDate(
                getToday(),
            );

            setShowContributionForm(
                false,
            );

            router.refresh();
        } catch (err) {
            setError(
                getErrorMessage(err),
            );
        } finally {
            setIsSubmitting(
                false,
            );
        }
    }

    /* ==========================================================
       DELETE GOAL
       ========================================================== */

    async function handleDelete() {
        const confirmed =
            window.confirm(
                `Delete "${goal.name}"? This will also remove all contribution history for this goal.`,
            );

        if (!confirmed) {
            return;
        }

        setError(null);

        try {
            setIsDeleting(
                true,
            );

            await deleteGoal(
                goal.id,
            );

            router.push(
                "/goals",
            );

            router.refresh();
        } catch (err) {
            setError(
                getErrorMessage(err),
            );

            setIsDeleting(
                false,
            );
        }
    }

    /* ==========================================================
       RENDER
       ========================================================== */

    return (
        <>
            {/* ================================================== */}
            {/* ACTIONS */}
            {/* ================================================== */}

            <div
                className={
                    styles.actionButtons
                }
            >
                <button
                    type="button"
                    className={
                        styles.editButton
                    }
                    onClick={
                        handleOpenEdit
                    }
                >
                    <Pencil
                        size={15}
                    />

                    Edit Goal
                </button>

                {!goal.is_completed && (
                    <button
                        type="button"
                        className={
                            styles.addButton
                        }
                        onClick={() => {
                            setError(null);

                            setShowContributionForm(
                                true,
                            );
                        }}
                    >
                        <Plus
                            size={16}
                        />

                        Add Contribution
                    </button>
                )}

                <button
                    type="button"
                    className={
                        styles.deleteButton
                    }
                    onClick={
                        handleDelete
                    }
                    disabled={
                        isDeleting
                    }
                    aria-label="Delete goal"
                >
                    {isDeleting ? (
                        <Loader2
                            size={16}
                            className={
                                styles.spinner
                            }
                        />
                    ) : (
                        <Trash2
                            size={16}
                        />
                    )}
                </button>
            </div>

            {/* ================================================== */}
            {/* EDIT GOAL MODAL */}
            {/* ================================================== */}

            {showEditForm && (
                <div
                    className={
                        styles.modalOverlay
                    }
                    role="presentation"
                    onMouseDown={(
                        event,
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setShowEditForm(
                                false,
                            );
                        }
                    }}
                >
                    <div
                        className={
                            styles.modal
                        }
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-goal-title"
                    >
                        <div
                            className={
                                styles.modalHeader
                            }
                        >
                            <div>
                                <p
                                    className={
                                        styles.sectionEyebrow
                                    }
                                >
                                    FINANCIAL GOAL
                                </p>

                                <h2 id="edit-goal-title">
                                    Edit Goal
                                </h2>
                            </div>

                            <button
                                type="button"
                                className={
                                    styles.closeButton
                                }
                                onClick={() =>
                                    setShowEditForm(
                                        false,
                                    )
                                }
                                aria-label="Close"
                            >
                                <X
                                    size={17}
                                />
                            </button>
                        </div>

                        <form
                            className={
                                styles.contributionForm
                            }
                            onSubmit={
                                handleEditSubmit
                            }
                        >
                            {/* Goal name */}

                            <div
                                className={
                                    styles.modalField
                                }
                            >
                                <label htmlFor="edit-goal-name">
                                    Goal name
                                </label>

                                <input
                                    id="edit-goal-name"
                                    type="text"
                                    value={
                                        editName
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setEditName(
                                            event.target
                                                .value,
                                        )
                                    }
                                    maxLength={150}
                                    autoComplete="off"
                                    autoFocus
                                />
                            </div>

                            {/* Description */}

                            <div
                                className={
                                    styles.modalField
                                }
                            >
                                <label htmlFor="edit-goal-description">
                                    Description
                                    <span
                                        className={
                                            styles.optional
                                        }
                                    >
                                        Optional
                                    </span>
                                </label>

                                <textarea
                                    id="edit-goal-description"
                                    value={
                                        editDescription
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setEditDescription(
                                            event.target
                                                .value,
                                        )
                                    }
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Describe your financial goal"
                                />
                            </div>

                            {/* Target amount */}

                            <div
                                className={
                                    styles.modalField
                                }
                            >
                                <label htmlFor="edit-target-amount">
                                    Target amount
                                </label>

                                <div
                                    className={
                                        styles.modalAmountInput
                                    }
                                >
                                    <span>
                                        ₹
                                    </span>

                                    <input
                                        id="edit-target-amount"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            editTargetAmount
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditTargetAmount(
                                                event.target
                                                    .value,
                                            )
                                        }
                                        inputMode="decimal"
                                    />
                                </div>
                            </div>

                            {/* Target date */}

                            <div
                                className={
                                    styles.modalField
                                }
                            >
                                <label htmlFor="edit-target-date">
                                    Target date
                                    <span
                                        className={
                                            styles.optional
                                        }
                                    >
                                        Optional
                                    </span>
                                </label>

                                <div
                                    className={
                                        styles.modalAmountInput
                                    }
                                >
                                    <span>
                                        <CalendarDays
                                            size={14}
                                        />
                                    </span>

                                    <input
                                        id="edit-target-date"
                                        type="date"
                                        value={
                                            editTargetDate
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditTargetDate(
                                                event.target
                                                    .value,
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            {/* Icon */}

                            <div
                                className={
                                    styles.modalField
                                }
                            >
                                <label htmlFor="edit-goal-icon">
                                    Goal icon
                                </label>

                                <select
                                    id="edit-goal-icon"
                                    className={styles.editSelect}
                                    value={editIcon}
                                    onChange={(event) =>
                                        setEditIcon(
                                            event.target.value as GoalIcon,
                                        )
                                    }
                                >
                                    <option value="target">
                                        General
                                    </option>

                                    <option value="shield">
                                        Emergency
                                    </option>

                                    <option value="trending">
                                        Investment
                                    </option>

                                    <option value="wallet">
                                        Purchase
                                    </option>

                                    <option value="calendar">
                                        Travel
                                    </option>
                                </select>
                            </div>

                            {/* Current savings */}

                            <div
                                className={
                                    styles.modalRemaining
                                }
                            >
                                <span>
                                    Current savings
                                </span>

                                <strong>
                                    ₹
                                    {Number(
                                        goal.current_amount,
                                    ).toLocaleString(
                                        "en-IN",
                                        {
                                            maximumFractionDigits: 2,
                                        },
                                    )}
                                </strong>
                            </div>

                            {error && (
                                <div
                                    className={
                                        styles.modalError
                                    }
                                    role="alert"
                                >
                                    {error}
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
                                        styles.modalCancel
                                    }
                                    onClick={() =>
                                        setShowEditForm(
                                            false,
                                        )
                                    }
                                    disabled={
                                        isUpdating
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className={
                                        styles.modalSubmit
                                    }
                                    disabled={
                                        isUpdating
                                    }
                                >
                                    {isUpdating ? (
                                        <>
                                            <Loader2
                                                size={16}
                                                className={
                                                    styles.spinner
                                                }
                                            />

                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save
                                                size={16}
                                            />

                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================================== */}
            {/* CONTRIBUTION MODAL */}
            {/* ================================================== */}

            {showContributionForm && (
                <div
                    className={
                        styles.modalOverlay
                    }
                    role="presentation"
                    onMouseDown={(
                        event,
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setShowContributionForm(
                                false,
                            );
                        }
                    }}
                >
                    <div
                        className={
                            styles.modal
                        }
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="contribution-title"
                    >
                        <div
                            className={
                                styles.modalHeader
                            }
                        >
                            <div>
                                <p
                                    className={
                                        styles.sectionEyebrow
                                    }
                                >
                                    GOAL CONTRIBUTION
                                </p>

                                <h2 id="contribution-title">
                                    Add Contribution
                                </h2>
                            </div>

                            <button
                                type="button"
                                className={
                                    styles.closeButton
                                }
                                onClick={() =>
                                    setShowContributionForm(
                                        false,
                                    )
                                }
                                aria-label="Close"
                            >
                                <X
                                    size={17}
                                />
                            </button>
                        </div>

                        <form
                            className={
                                styles.contributionForm
                            }
                            onSubmit={
                                handleContributionSubmit
                            }
                        >
                            <div
                                className={
                                    styles.modalRemaining
                                }
                            >
                                <span>
                                    Remaining to reach goal
                                </span>

                                <strong>
                                    ₹
                                    {remaining.toLocaleString(
                                        "en-IN",
                                    )}
                                </strong>
                            </div>

                            <div
                                className={
                                    styles.modalField
                                }
                            >
                                <label htmlFor="contribution-amount">
                                    Amount
                                </label>

                                <div
                                    className={
                                        styles.modalAmountInput
                                    }
                                >
                                    <span>
                                        ₹
                                    </span>

                                    <input
                                        id="contribution-amount"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            contributionAmount
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setContributionAmount(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="10,000"
                                        autoFocus
                                        inputMode="decimal"
                                    />
                                </div>
                            </div>

                            <div
                                className={
                                    styles.modalField
                                }
                            >
                                <label htmlFor="contribution-date">
                                    Contribution date
                                </label>

                                <input
                                    id="contribution-date"
                                    type="date"
                                    value={
                                        contributionDate
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setContributionDate(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                />
                            </div>

                            <div
                                className={
                                    styles.modalField
                                }
                            >
                                <label htmlFor="contribution-notes">
                                    Notes
                                    <span
                                        className={
                                            styles.optional
                                        }
                                    >
                                        Optional
                                    </span>
                                </label>

                                <textarea
                                    id="contribution-notes"
                                    value={
                                        contributionNotes
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setContributionNotes(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="e.g. Monthly savings"
                                    rows={3}
                                />
                            </div>

                            {error && (
                                <div
                                    className={
                                        styles.modalError
                                    }
                                    role="alert"
                                >
                                    {error}
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
                                        styles.modalCancel
                                    }
                                    onClick={() =>
                                        setShowContributionForm(
                                            false,
                                        )
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className={
                                        styles.modalSubmit
                                    }
                                    disabled={
                                        isSubmitting
                                    }
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2
                                                size={16}
                                                className={
                                                    styles.spinner
                                                }
                                            />

                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus
                                                size={16}
                                            />

                                            Add Contribution
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}