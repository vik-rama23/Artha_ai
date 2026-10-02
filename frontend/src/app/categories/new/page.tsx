import Link from "next/link";

import CategoryForm from "@/components/categories/CategoryForm";

import styles from "./new-category.module.scss";

export default function NewCategoryPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/categories" className={styles.backLink}>
          ← Back to Categories
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>CATEGORY MANAGEMENT</p>

          <h1>Add Category</h1>

          <p className={styles.subtitle}>
            Create a custom category to organize your money
            activity.
          </p>
        </header>

        <CategoryForm />
      </div>
    </main>
  );
}