"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import {
  getAccounts,
  type Account,
} from "@/lib/api/accounts";

import styles from "./TransactionFilters.module.scss";

type DateFilter =
  | ""
  | "today"
  | "this_week"
  | "this_month"
  | "last_month";

function formatDate(
  date: Date
): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateRange(
  filter: DateFilter
): {
  startDate?: string;
  endDate?: string;
} {
  const now = new Date();

  if (filter === "today") {
    const today = formatDate(now);

    return {
      startDate: today,
      endDate: today,
    };
  }

  if (filter === "this_week") {
    const currentDay = now.getDay();

    const mondayOffset =
      currentDay === 0
        ? -6
        : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(
      now.getDate() + mondayOffset
    );

    return {
      startDate: formatDate(monday),
      endDate: formatDate(now),
    };
  }

  if (filter === "this_month") {
    const firstDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    return {
      startDate: formatDate(firstDay),
      endDate: formatDate(now),
    };
  }

  if (filter === "last_month") {
    const firstDayLastMonth =
      new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

    const lastDayLastMonth =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        0
      );

    return {
      startDate: formatDate(
        firstDayLastMonth
      ),
      endDate: formatDate(
        lastDayLastMonth
      ),
    };
  }

  return {};
}

export default function TransactionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [accountId, setAccountId] =
    useState(
      searchParams.get("account_id") ?? ""
    );

  const [transactionType, setTransactionType] =
    useState<
      "" | "INCOME" | "EXPENSE"
    >(
      (searchParams.get(
        "transaction_type"
      ) as
        | ""
        | "INCOME"
        | "EXPENSE") ?? ""
    );

  const [dateFilter, setDateFilter] =
    useState<DateFilter>("");

  const [loadingAccounts, setLoadingAccounts] =
    useState(true);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await getAccounts();
        setAccounts(data);
      } catch (error) {
        console.error(
          "Failed to load accounts:",
          error
        );
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, []);

  function handleApply(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (accountId) {
      params.set(
        "account_id",
        accountId
      );
    }

    if (transactionType) {
      params.set(
        "transaction_type",
        transactionType
      );
    }

    const {
      startDate,
      endDate,
    } = getDateRange(dateFilter);

    if (startDate) {
      params.set(
        "start_date",
        startDate
      );
    }

    if (endDate) {
      params.set(
        "end_date",
        endDate
      );
    }

    const queryString =
      params.toString();

    router.push(
      queryString
        ? `/transactions?${queryString}`
        : "/transactions"
    );
  }

  function handleClear() {
    setAccountId("");
    setTransactionType("");
    setDateFilter("");

    router.push("/transactions");
  }

  return (
    <form
      className={styles.filters}
      onSubmit={handleApply}
    >
      <div className={styles.filterHeader}>
        <div>
          <strong>Filter Transactions</strong>

          <span>
            Narrow transactions by account,
            type or date.
          </span>
        </div>

        <button
          type="button"
          className={styles.clearButton}
          onClick={handleClear}
          disabled={
            !accountId &&
            !transactionType &&
            !dateFilter
          }
        >
          Clear filters
        </button>
      </div>

      <div className={styles.filterGrid}>
        <div className={styles.field}>
          <label htmlFor="account-filter">
            Account
          </label>

          <select
            id="account-filter"
            value={accountId}
            onChange={(event) =>
              setAccountId(
                event.target.value
              )
            }
            disabled={loadingAccounts}
          >
            <option value="">
              {loadingAccounts
                ? "Loading accounts..."
                : "All Accounts"}
            </option>

            {accounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name}
                {account.institution_name
                  ? ` · ${account.institution_name}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="type-filter">
            Transaction Type
          </label>

          <select
            id="type-filter"
            value={transactionType}
            onChange={(event) =>
              setTransactionType(
                event.target.value as
                  | ""
                  | "INCOME"
                  | "EXPENSE"
              )
            }
          >
            <option value="">
              All Types
            </option>

            <option value="EXPENSE">
              Expenses
            </option>

            <option value="INCOME">
              Income
            </option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="date-filter">
            Date
          </label>

          <select
            id="date-filter"
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target.value as DateFilter
              )
            }
          >
            <option value="">
              All Dates
            </option>

            <option value="today">
              Today
            </option>

            <option value="this_week">
              This Week
            </option>

            <option value="this_month">
              This Month
            </option>

            <option value="last_month">
              Last Month
            </option>
          </select>
        </div>

        <div className={styles.actionField}>
          <button
            type="submit"
            className={styles.applyButton}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </form>
  );
}