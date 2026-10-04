"use client";

import { useMemo, useState } from "react";

import TransactionFilters from "./TransactionFilters";
import TransactionTable from "./TransactionTable";

import type { Account } from "@/lib/api/accounts";
import type { Category } from "@/lib/api/categories";

import type { Transaction } from "@/types/transaction";

import styles from "@/app/transactions/transactions.module.scss";

type TransactionResultsProps = {
  transactions: Transaction[];
  total: number;
  accounts: Account[];
  categories: Category[];
};

export default function TransactionResults({
  transactions,
  total,
  accounts,
  categories,
}: TransactionResultsProps) {
  const [search, setSearch] =
    useState("");

  const filteredTransactions =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return transactions;
      }

      return transactions.filter(
        (transaction) => {
          const merchant =
            transaction.merchant
              ?.toLowerCase() ?? "";

          const description =
            transaction.description
              ?.toLowerCase() ?? "";

          return (
            merchant.includes(
              normalizedSearch
            ) ||
            description.includes(
              normalizedSearch
            )
          );
        }
      );
    },
    [transactions, search]);

  const visibleCount =
    filteredTransactions.length;

  return (
    <>
      <TransactionFilters
        accounts={accounts}
        categories={categories}
        search={search}
        onSearchChange={setSearch}
      />

      {visibleCount === 0 ? (
        <div
          className={
            styles.emptyState
          }
        >
          <strong>
            No matching transactions
          </strong>

          <span>
            Try a different merchant or
            description.
          </span>

          <button
            type="button"
            className={
              styles.emptyButton
            }
            onClick={() =>
              setSearch("")
            }
          >
            Clear Search
          </button>
        </div>
      ) : (
        <>
          <div
            className={
              styles.searchResultSummary
            }
          >
            {search.trim() ? (
              <>
                Showing{" "}
                <strong>
                  {visibleCount}
                </strong>{" "}
                of{" "}
                <strong>
                  {transactions.length}
                </strong>{" "}
                visible transactions
              </>
            ) : (
              <>
                Showing{" "}
                <strong>
                  {visibleCount}
                </strong>{" "}
                transaction
                {visibleCount === 1
                  ? ""
                  : "s"}
              </>
            )}
          </div>

          <TransactionTable
            transactions={
              filteredTransactions
            }
          />
        </>
      )}
    </>
  );
}