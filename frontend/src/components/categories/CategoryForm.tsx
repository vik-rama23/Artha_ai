"use client";

import { ArrowLeft, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createCategory,
  updateCategory,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from "@/lib/api/categories";

import styles from "./CategoryForm.module.scss";

type CategoryFormProps = {
  mode?: "create" | "edit";
  categoryId?: string;
  initialValues?: Partial<CreateCategoryPayload>;
};

const DEFAULT_VALUES: CreateCategoryPayload = {
  name: "",
  category_type: "EXPENSE",
  icon: "",
};

const ICON_OPTIONS = [
  { value: "shopping-cart", label: "Shopping" },
  { value: "utensils", label: "Food" },
  { value: "car", label: "Transport" },
  { value: "home", label: "Home" },
  { value: "heart-pulse", label: "Health" },
  { value: "graduation-cap", label: "Education" },
  { value: "plane", label: "Travel" },
  { value: "film", label: "Entertainment" },
  { value: "shopping-bag", label: "Shopping Bag" },
  { value: "wallet", label: "Wallet" },
  { value: "gift", label: "Gift" },
  { value: "briefcase", label: "Work" },
  { value: "banknote", label: "Money" },
  { value: "receipt", label: "Receipt" },
  { value: "circle", label: "Other" },
];

export default function CategoryForm({
  mode = "create",
  categoryId,
  initialValues,
}: CategoryFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<CreateCategoryPayload>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CreateCategoryPayload>(
    field: K,
    value: CreateCategoryPayload[K]
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
      setError("Please enter a category name.");
      return;
    }

    if (mode === "edit" && !categoryId) {
      setError("Category ID is missing.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (mode === "edit" && categoryId) {
        const payload: UpdateCategoryPayload = {
          name: form.name.trim(),
          category_type: form.category_type,
          icon: form.icon?.trim() || null,
        };

        await updateCategory(categoryId, payload);
      } else {
        const payload: CreateCategoryPayload = {
          name: form.name.trim(),
          category_type: form.category_type,
          icon: form.icon?.trim() || null,
        };

        await createCategory(payload);
      }

      router.push("/categories");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "edit"
            ? "Unable to update category."
            : "Unable to create category."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="name">Category Name</label>

          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(event) =>
              updateField("name", event.target.value)
            }
            placeholder="e.g. Groceries"
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="category_type">
            Category Type
          </label>

          <select
            id="category_type"
            value={form.category_type}
            onChange={(event) =>
              updateField(
                "category_type",
                event.target.value as "INCOME" | "EXPENSE"
              )
            }
            disabled={submitting}
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label htmlFor="icon">Icon</label>

          <select
            id="icon"
            value={form.icon ?? ""}
            onChange={(event) =>
              updateField("icon", event.target.value)
            }
            disabled={submitting}
          >
            <option value="">Select an icon</option>

            {ICON_OPTIONS.map((icon) => (
              <option
                key={icon.value}
                value={icon.value}
              >
                {icon.label}
              </option>
            ))}
          </select>

          <p className={styles.helperText}>
            Choose an icon to make this category easier to
            recognize.
          </p>
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
          onClick={() => router.push("/categories")}
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
              : "Create Category"}
        </button>
      </div>
    </form>
  );
}