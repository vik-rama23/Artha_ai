"use client";

import {
  Search,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import type { Account } from "@/lib/api/accounts";

import type { Category } from "@/lib/api/categories";

import styles from "./TransactionFilters.module.scss";

type TransactionFiltersProps = {
  accounts: Account[];
  categories: Category[];
  search: string;
  onSearchChange: (
    value: string
  ) => void;
};

type TransactionType =
  | "INCOME"
  | "EXPENSE"
  | "";

export default function TransactionFilters({
  accounts,
  categories,
  search,
  onSearchChange,
}: TransactionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams =
    useSearchParams();

  const initialAccount =
    searchParams.get("account_id") ??
    "";

  const initialCategory =
    searchParams.get("category_id") ??
    "";

  const initialType =
    (searchParams.get(
      "transaction_type"
    ) as TransactionType) ?? "";

  const initialStartDate =
    searchParams.get("start_date") ??
    "";

  const initialEndDate =
    searchParams.get("end_date") ??
    "";

  const [accountId, setAccountId] =
    useState(initialAccount);

  const [categoryId, setCategoryId] =
    useState(initialCategory);

  const [transactionType, setTransactionType] =
    useState<TransactionType>(
      initialType
    );

  const [dateFilter, setDateFilter] =
    useState(() => {
      if (
        initialStartDate &&
        initialEndDate
      ) {
        return "custom";
      }

      return "";
    });

  const [customStartDate, setCustomStartDate] =
    useState(initialStartDate);

  const [customEndDate, setCustomEndDate] =
    useState(initialEndDate);

  const filteredCategories =
    useMemo(() => {
      return categories.filter(
        (category) => {
          if (!category.is_active) {
            return false;
          }

          if (
            transactionType &&
            category.category_type !==
              transactionType
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      categories,
      transactionType,
    ]);

  function handleTypeChange(
    value: TransactionType
  ) {
    setTransactionType(value);

    if (
      categoryId &&
      value
    ) {
      const selectedCategory =
        categories.find(
          (category) =>
            category.id ===
            categoryId
        );

      if (
        selectedCategory &&
        selectedCategory.category_type !==
          value
      ) {
        setCategoryId("");
      }
    }
  }

  function formatDate(
    date: Date
  ) {
    return date
      .toISOString()
      .split("T")[0];
  }

  function handleDateChange(
    value: string
  ) {
    setDateFilter(value);

    const today =
      new Date();

    if (value === "today") {
      const date =
        formatDate(today);

      setCustomStartDate(date);
      setCustomEndDate(date);

      return;
    }

    if (value === "7d") {
      const start =
        new Date(today);

      start.setDate(
        start.getDate() - 6
      );

      setCustomStartDate(
        formatDate(start)
      );

      setCustomEndDate(
        formatDate(today)
      );

      return;
    }

    if (value === "30d") {
      const start =
        new Date(today);

      start.setDate(
        start.getDate() - 29
      );

      setCustomStartDate(
        formatDate(start)
      );

      setCustomEndDate(
        formatDate(today)
      );

      return;
    }

    if (value === "this_month") {
      const start =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );

      setCustomStartDate(
        formatDate(start)
      );

      setCustomEndDate(
        formatDate(today)
      );

      return;
    }

    if (value === "last_month") {
      const start =
        new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );

      const end =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          0
        );

      setCustomStartDate(
        formatDate(start)
      );

      setCustomEndDate(
        formatDate(end)
      );

      return;
    }

    if (value !== "custom") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  }

  function handleApply() {
    const params =
      new URLSearchParams();

    if (accountId) {
      params.set(
        "account_id",
        accountId
      );
    }

    if (categoryId) {
      params.set(
        "category_id",
        categoryId
      );
    }

    if (transactionType) {
      params.set(
        "transaction_type",
        transactionType
      );
    }

    if (customStartDate) {
      params.set(
        "start_date",
        customStartDate
      );
    }

    if (customEndDate) {
      params.set(
        "end_date",
        customEndDate
      );
    }

    /*
     * Search is intentionally NOT added
     * to the URL because it is a
     * frontend-only filter.
     */

    params.delete("page");

    const queryString =
      params.toString();

    router.push(
      queryString
        ? `${pathname}?${queryString}`
        : pathname
    );
  }

  function handleClear() {
    setAccountId("");
    setCategoryId("");
    setTransactionType("");
    setDateFilter("");
    setCustomStartDate("");
    setCustomEndDate("");

    onSearchChange("");

    router.push(pathname);
  }

  return (
    <div className={styles.filters}>
      <div
        className={
          styles.searchWrapper
        }
      >
        <Search
          size={20}
          className={
            styles.searchIcon
          }
        />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            onSearchChange(
              event.target.value
            )
          }
          placeholder="Search by merchant or description..."
          className={
            styles.searchInput
          }
          aria-label="Search transactions"
        />

        {search && (
          <button
            type="button"
            className={
              styles.searchClear
            }
            onClick={() =>
              onSearchChange("")
            }
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div
        className={
          styles.filterGrid
        }
      >
        <label
          className={styles.field}
        >
          <span>
            Account
          </span>

          <select
            value={accountId}
            onChange={(event) =>
              setAccountId(
                event.target.value
              )
            }
          >
            <option value="">
              All accounts
            </option>

            {accounts.map(
              (account) => (
                <option
                  key={account.id}
                  value={account.id}
                >
                  {account.name}
                </option>
              )
            )}
          </select>
        </label>

        <label
          className={styles.field}
        >
          <span>
            Category
          </span>

          <select
            value={categoryId}
            onChange={(event) =>
              setCategoryId(
                event.target.value
              )
            }
          >
            <option value="">
              All categories
            </option>

            {filteredCategories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              )
            )}
          </select>
        </label>

        <label
          className={styles.field}
        >
          <span>
            Type
          </span>

          <select
            value={transactionType}
            onChange={(event) =>
              handleTypeChange(
                event.target
                  .value as TransactionType
              )
            }
          >
            <option value="">
              All types
            </option>

            <option value="EXPENSE">
              Expense
            </option>

            <option value="INCOME">
              Income
            </option>
          </select>
        </label>

        <label
          className={styles.field}
        >
          <span>
            Date
          </span>

          <select
            value={dateFilter}
            onChange={(event) =>
              handleDateChange(
                event.target.value
              )
            }
          >
            <option value="">
              All dates
            </option>

            <option value="today">
              Today
            </option>

            <option value="7d">
              Last 7 days
            </option>

            <option value="30d">
              Last 30 days
            </option>

            <option value="this_month">
              This month
            </option>

            <option value="last_month">
              Last month
            </option>

            <option value="custom">
              Custom range
            </option>
          </select>
        </label>

        {dateFilter ===
          "custom" && (
          <>
            <label
              className={
                styles.field
              }
            >
              <span>
                Start date
              </span>

              <input
                type="date"
                value={
                  customStartDate
                }
                onChange={(event) =>
                  setCustomStartDate(
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label
              className={
                styles.field
              }
            >
              <span>
                End date
              </span>

              <input
                type="date"
                value={
                  customEndDate
                }
                onChange={(event) =>
                  setCustomEndDate(
                    event.target
                      .value
                  )
                }
              />
            </label>
          </>
        )}
      </div>

      <div
        className={
          styles.actions
        }
      >
        <button
          type="button"
          className={
            styles.clearButton
          }
          onClick={handleClear}
        >
          Clear
        </button>

        <button
          type="button"
          className={
            styles.applyButton
          }
          onClick={handleApply}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}