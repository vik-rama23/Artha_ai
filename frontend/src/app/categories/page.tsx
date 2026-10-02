"use client";

import {
  Banknote,
  Briefcase,
  Car,
  Circle,
  Edit3,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Package,
  Power,
  Receipt,
  Search,
  ShoppingBag,
  ShoppingCart,
  Tags,
  Utensils,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getCategories,
  updateCategory,
  type Category,
} from "@/lib/api/categories";

import styles from "./categories.module.scss";

type CategoryFilter = "ALL" | "EXPENSE" | "INCOME";
type SourceFilter = "ALL" | "SYSTEM" | "CUSTOM";

const CATEGORY_ICONS = {
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  car: Car,
  home: Home,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  plane: Package,
  film: Film,
  "shopping-bag": ShoppingBag,
  wallet: Wallet,
  gift: Gift,
  briefcase: Briefcase,
  banknote: Banknote,
  receipt: Receipt,
  tags: Tags,
  circle: Circle,
} as const;

function getCategoryIcon(icon: string | null) {
  if (!icon) {
    return Tags;
  }

  return (
    CATEGORY_ICONS[
      icon as keyof typeof CATEGORY_ICONS
    ] ?? Tags
  );
}

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("ALL");

  const [search, setSearch] = useState("");

  const [typeFilter, setTypeFilter] =
    useState<"ALL" | "EXPENSE" | "INCOME">("ALL");

  const [sourceFilter, setSourceFilter] =
    useState<SourceFilter>("ALL");

  async function loadCategories() {
    try {
      setLoading(true);
      setError(null);

      const response = await getCategories();

      setCategories(response.items);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load categories."
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

        const response = await getCategories();

        if (!active) {
          return;
        }

        setCategories(response.items);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load categories."
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

 async function handleDeactivate(
  category: Category
) {
  const confirmed = window.confirm(
    `Deactivate "${category.name}"?`
  );

  if (!confirmed) {
    return;
  }

  try {
    setError(null);

    await updateCategory(
      category.id,
      {
        is_active: false,
      }
    );

    await loadCategories();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to deactivate category."
    );
  }
}

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return categories.filter((category) => {
      if (
        categoryFilter !== "ALL" &&
        category.category_type !== categoryFilter
      ) {
        return false;
      }

      if (
        typeFilter !== "ALL" &&
        category.category_type !== typeFilter
      ) {
        return false;
      }

      if (
        sourceFilter === "SYSTEM" &&
        !category.is_system
      ) {
        return false;
      }

      if (
        sourceFilter === "CUSTOM" &&
        category.is_system
      ) {
        return false;
      }

      if (
        normalizedSearch &&
        !category.name
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        return false;
      }

      return true;
    });
  }, [
    categories,
    categoryFilter,
    search,
    sourceFilter,
    typeFilter,
  ]);

  const totalCategories = categories.length;

  const expenseCategories = categories.filter(
    (category) => category.category_type === "EXPENSE"
  ).length;

  const incomeCategories = categories.filter(
    (category) => category.category_type === "INCOME"
  ).length;

  const systemCategories = filteredCategories.filter(
    (category) => category.is_system
  );

  const customCategories = filteredCategories.filter(
    (category) => !category.is_system
  );

  function clearFilters() {
    setSearch("");
    setTypeFilter("ALL");
    setSourceFilter("ALL");
    setCategoryFilter("ALL");
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              MONEY ORGANIZATION
            </p>

            <h1>Categories</h1>

            <p className={styles.subtitle}>
              Organize your income and expenses so you can
              understand where your money goes.
            </p>
          </div>

          <button
            type="button"
            className={styles.addButton}
            onClick={() => router.push("/categories/new")}
          >
            <span className={styles.addIcon}>+</span>
            Add Category
          </button>
        </header>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <Tags size={21} strokeWidth={1.8} />
            </div>

            <div>
              <strong>{totalCategories}</strong>
              <span>Total Categories</span>
            </div>
          </article>

          <article className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <Receipt size={21} strokeWidth={1.8} />
            </div>

            <div>
              <strong>{expenseCategories}</strong>
              <span>Expense Categories</span>
            </div>
          </article>

          <article className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <Wallet size={21} strokeWidth={1.8} />
            </div>

            <div>
              <strong>{incomeCategories}</strong>
              <span>Income Categories</span>
            </div>
          </article>
        </section>

        <section className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>All Categories</h2>

              <p>
                Manage the categories used to classify your
                transactions.
              </p>
            </div>

            <div className={styles.quickFilters}>
              <button
                type="button"
                className={
                  categoryFilter === "ALL"
                    ? styles.activeFilter
                    : styles.filterButton
                }
                onClick={() => setCategoryFilter("ALL")}
              >
                All
              </button>

              <button
                type="button"
                className={
                  categoryFilter === "EXPENSE"
                    ? styles.activeFilter
                    : styles.filterButton
                }
                onClick={() =>
                  setCategoryFilter("EXPENSE")
                }
              >
                Expenses
              </button>

              <button
                type="button"
                className={
                  categoryFilter === "INCOME"
                    ? styles.activeFilter
                    : styles.filterButton
                }
                onClick={() =>
                  setCategoryFilter("INCOME")
                }
              >
                Income
              </button>
            </div>
          </div>

          <div className={styles.tableToolbar}>
            <div className={styles.searchBox}>
              <Search
                size={17}
                strokeWidth={1.8}
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search categories..."
              />
            </div>

            <div className={styles.toolbarFilters}>
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value as
                      | "ALL"
                      | "EXPENSE"
                      | "INCOME"
                  )
                }
                aria-label="Filter by category type"
              >
                <option value="ALL">
                  All Types
                </option>
                <option value="EXPENSE">
                  Expense
                </option>
                <option value="INCOME">
                  Income
                </option>
              </select>

              <select
                value={sourceFilter}
                onChange={(event) =>
                  setSourceFilter(
                    event.target.value as SourceFilter
                  )
                }
                aria-label="Filter by category source"
              >
                <option value="ALL">
                  All Categories
                </option>
                <option value="SYSTEM">
                  System
                </option>
                <option value="CUSTOM">
                  Custom
                </option>
              </select>

              {(search ||
                typeFilter !== "ALL" ||
                sourceFilter !== "ALL" ||
                categoryFilter !== "ALL") && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={clearFilters}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {loading ? (
            <div className={styles.emptyState}>
              Loading categories...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className={styles.emptyState}>
              <Tags size={28} />

              <strong>
                No categories found
              </strong>

              <span>
                Try changing your filters or create a new
                category.
              </span>
            </div>
          ) : (
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <span>Category</span>
                <span>Type</span>
                <span>Source</span>
                <span>Actions</span>
              </div>

              {systemCategories.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h3>System Categories</h3>
                      <p>
                        Default categories provided by Artha.
                      </p>
                    </div>

                    <span className={styles.countBadge}>
                      {systemCategories.length}
                    </span>
                  </div>

                  {systemCategories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      onEdit={() =>
                        router.push(
                          `/categories/${category.id}/edit`
                        )
                      }
                      onDeactivate={() =>
                        handleDeactivate(category)
                      }
                    />
                  ))}
                </div>
              )}

              {customCategories.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h3>Your Categories</h3>
                      <p>
                        Categories created specifically for
                        your account.
                      </p>
                    </div>

                    <span className={styles.countBadge}>
                      {customCategories.length}
                    </span>
                  </div>

                  {customCategories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      onEdit={() =>
                        router.push(
                          `/categories/${category.id}/edit`
                        )
                      }
                      onDeactivate={() =>
                        handleDeactivate(category)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

type CategoryRowProps = {
  category: Category;
  onEdit: () => void;
  onDeactivate: () => void;
};

type CategoryIconProps = {
  icon: string | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

function CategoryIcon({
  icon,
  ...props
}: CategoryIconProps) {
  const Icon = getCategoryIcon(icon);

  return <Icon {...props} />;
}

function CategoryRow({
  category,
  onEdit,
  onDeactivate,
}: CategoryRowProps) {
  return (
    <div className={styles.categoryRow}>
      <div className={styles.categoryMain}>
        <div className={styles.categoryIcon}>
          <CategoryIcon
            icon={category.icon}
            size={21}
            strokeWidth={1.8}
          />
        </div>

        <div className={styles.categoryInfo}>
          <strong>{category.name}</strong>

          <span>
            {category.category_type === "EXPENSE"
              ? "Expense"
              : "Income"}{" "}
            · {category.is_system ? "System" : "Custom"}
          </span>
        </div>
      </div>

      <div>
        <span
          className={
            category.category_type === "EXPENSE"
              ? styles.expenseBadge
              : styles.incomeBadge
          }
        >
          {category.category_type === "EXPENSE"
            ? "Expense"
            : "Income"}
        </span>
      </div>

      <div className={styles.sourceCell}>
        {category.is_system ? "System" : "Custom"}
      </div>

      <div className={styles.actions}>
        {!category.is_system && (
          <>
            <button
              type="button"
              className={styles.iconButton}
              title="Edit category"
              aria-label="Edit category"
              onClick={onEdit}
            >
              <Edit3
                size={17}
                strokeWidth={1.8}
              />
            </button>

            <button
              type="button"
              className={styles.iconButton}
              title="Deactivate category"
              aria-label="Deactivate category"
              onClick={onDeactivate}
            >
              <Power
                size={17}
                strokeWidth={1.8}
              />
            </button>
          </>
        )}
      </div>
    </div>
  );
}