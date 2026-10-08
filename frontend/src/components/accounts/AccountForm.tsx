"use client";

import { ArrowLeft, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createAccount,
  updateAccount,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from "@/lib/api/accounts";

import styles from "./AccountForm.module.scss";

type AccountFormProps = {
  mode?: "create" | "edit";
  accountId?: string;
  initialValues?: Partial<CreateAccountPayload>;
};

const DEFAULT_VALUES: CreateAccountPayload = {
  name: "",
  account_type: "BANK",
  institution_name: "",
  account_number_last4: "",
  opening_balance: 0,
  currency: "INR",
  notes: "",
};

export default function AccountForm({
  mode = "create",
  accountId,
  initialValues,
}: AccountFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<CreateAccountPayload>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CreateAccountPayload>(
    field: K,
    value: CreateAccountPayload[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Please enter an account name.");
      return;
    }

    if (
      form.account_number_last4 &&
      form.account_number_last4.length !== 4
    ) {
      setError(
        "Last 4 digits must contain exactly 4 digits."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (mode === "edit" && accountId) {
        const payload: UpdateAccountPayload = {
          name: form.name.trim(),
          account_type: form.account_type,
          institution_name:
            form.institution_name?.trim() || null,
          account_number_last4:
            form.account_number_last4?.trim() || null,
          opening_balance: Number(form.opening_balance),
          currency: form.currency.toUpperCase(),
          notes: form.notes?.trim() || null,
        };

        await updateAccount(accountId, payload);
      } else {
        const payload: CreateAccountPayload = {
          name: form.name.trim(),
          account_type: form.account_type,
          institution_name:
            form.institution_name?.trim() || null,
          account_number_last4:
            form.account_number_last4?.trim() || null,
          opening_balance: Number(form.opening_balance),
          currency: form.currency.toUpperCase(),
          notes: form.notes?.trim() || null,
        };

        await createAccount(payload);
      }

      router.push("/accounts");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="name">
            Account Name
          </label>

          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(event) =>
              updateField("name", event.target.value)
            }
            placeholder="e.g. HDFC Savings"
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="account_type">
            Account Type
          </label>

          <select
            id="account_type"
            value={form.account_type}
            onChange={(event) =>
              updateField(
                "account_type",
                event.target.value
              )
            }
            disabled={submitting}
          >
            <option value="BANK">
              Bank Account
            </option>
            <option value="CREDIT_CARD">
              Credit Card
            </option>
            <option value="CASH">
              Cash
            </option>
            <option value="INVESTMENT">
              Investment
            </option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="institution_name">
            Institution
          </label>

          <input
            id="institution_name"
            type="text"
            value={form.institution_name ?? ""}
            onChange={(event) =>
              updateField(
                "institution_name",
                event.target.value
              )
            }
            placeholder="e.g. HDFC Bank"
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="account_number_last4">
            Last 4 Digits
          </label>

          <input
            id="account_number_last4"
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={form.account_number_last4 ?? ""}
            onChange={(event) =>
              updateField(
                "account_number_last4",
                event.target.value.replace(/\D/g, "")
              )
            }
            placeholder="1234"
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="opening_balance">
            Opening Balance
          </label>

          <input
            id="opening_balance"
            type="number"
            step="0.01"
            value={form.opening_balance}
            onChange={(event) =>
              updateField(
                "opening_balance",
                Number(event.target.value)
              )
            }
            placeholder="0.00"
            disabled={submitting}
          />

          <span className={styles.fieldHint}>
            Use a negative opening balance for an overdraft or
            credit balance that already existed when you started tracking.
          </span>
        </div>

        <div className={styles.field}>
          <label htmlFor="currency">
            Currency
          </label>

          <input
            id="currency"
            type="text"
            maxLength={3}
            value={form.currency}
            onChange={(event) =>
              updateField(
                "currency",
                event.target.value.toUpperCase()
              )
            }
            disabled={submitting}
          />
        </div>

        <div
          className={`${styles.field} ${styles.fullWidth}`}
        >
          <label htmlFor="notes">
            Notes
          </label>

          <textarea
            id="notes"
            rows={4}
            value={form.notes ?? ""}
            onChange={(event) =>
              updateField(
                "notes",
                event.target.value
              )
            }
            placeholder="Optional notes about this account"
            disabled={submitting}
          />
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => router.push("/accounts")}
          disabled={submitting}
        >
          <ArrowLeft size={17} />
          Cancel
        </button>

        <button
          type="submit"
          className={styles.primaryButton}
          disabled={submitting}
        >
          <Save size={17} />

          {submitting
            ? "Saving..."
            : mode === "edit"
              ? "Save Changes"
              : "Create Account"}
        </button>
      </div>
    </form>
  );
}