"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import CategoryForm from "@/components/categories/CategoryForm";
import {
  getCategory,
  type Category,
} from "@/lib/api/categories";

import styles from "./edit-category.module.scss";

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();

  const categoryId = params.categoryId as string;

  const [category, setCategory] =
    useState<Category | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategory() {
      try {
        setLoading(true);
        setError(null);

        const response = await getCategory(categoryId);

        if (response.is_system) {
          setError(
            "System categories cannot be edited."
          );
          return;
        }

        setCategory(response);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load category."
        );
      } finally {
        setLoading(false);
      }
    }

    if (categoryId) {
      loadCategory();
    }
  }, [categoryId]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            Loading category...
          </div>
        </div>
      </main>
    );
  }

  if (error || !category) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <Link
            href="/categories"
            className={styles.backLink}
          >
            ← Back to Categories
          </Link>

          <div className={styles.errorState}>
            <h1>Unable to edit category</h1>

            <p>
              {error ?? "Category not found."}
            </p>

            <button
              type="button"
              onClick={() => router.push("/categories")}
              className={styles.backButton}
            >
              Back to Categories
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link
          href="/categories"
          className={styles.backLink}
        >
          ← Back to Categories
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>
            CATEGORY MANAGEMENT
          </p>

          <h1>Edit Category</h1>

          <p className={styles.subtitle}>
            Update the details of your{" "}
            <strong>{category.name}</strong> category.
          </p>
        </header>

        <CategoryForm
          mode="edit"
          categoryId={category.id}
          initialValues={{
            name: category.name,
            category_type: category.category_type,
            icon: category.icon ?? "",
          }}
        />
      </div>
    </main>
  );
}