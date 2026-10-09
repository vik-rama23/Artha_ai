import Link from "next/link";

import { Download, Plus } from "lucide-react";

import {
  type TransactionFilters as TransactionFilterParams,
} from "@/lib/api/transactions";

import { getServerTransactions } from "@/lib/api/serverTransactions";
import { getServerAccounts } from "@/lib/api/serverAccounts";
import { getServerCategories } from "@/lib/api/serverCategories";

import TransactionResults from "@/components/transactions/TransactionResults";

import type { Transaction } from "@/types/transaction";

import styles from "./transactions.module.scss";

const PAGE_SIZE = 20;

type TransactionsPageProps = {
  searchParams: Promise<{
    account_id?: string;
    category_id?: string;
    transaction_type?: "INCOME" | "EXPENSE";
    start_date?: string;
    end_date?: string;
    page?: string;
  }>;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;

  const requestedPage = Number(params.page ?? "1");
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const filters: TransactionFilterParams = {
    accountId: params.account_id,
    categoryId: params.category_id,
    transactionType: params.transaction_type,
    startDate: params.start_date,
    endDate: params.end_date,
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
  };

  let transactions: Transaction[] = [];
  let total = 0;
  let error = false;

  try {
    const response = await getServerTransactions(filters);
    transactions = response.items;
    total = response.total;
  } catch (err) {
    console.error("Failed to load transactions:", err);
    error = true;
  }

  const [accounts, categories] = await Promise.all([
    getServerAccounts(),
    getServerCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const hasFilters =
    Boolean(params.account_id) ||
    Boolean(params.category_id) ||
    Boolean(params.transaction_type) ||
    Boolean(params.start_date) ||
    Boolean(params.end_date);

  const exportQuery = new URLSearchParams();
  if (params.account_id) exportQuery.set("account_id", params.account_id);
  if (params.category_id) exportQuery.set("category_id", params.category_id);
  if (params.transaction_type) exportQuery.set("transaction_type", params.transaction_type);
  if (params.start_date) exportQuery.set("start_date", params.start_date);
  if (params.end_date) exportQuery.set("end_date", params.end_date);

  const exportHref = exportQuery.size
    ? `/api/backend/api/v1/transactions/export?${exportQuery.toString()}`
    : "/api/backend/api/v1/transactions/export";

  function buildPageUrl(page: number): string {
    const query = new URLSearchParams();

    if (params.account_id) query.set("account_id", params.account_id);
    if (params.category_id) query.set("category_id", params.category_id);
    if (params.transaction_type) query.set("transaction_type", params.transaction_type);
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);
    if (page > 1) query.set("page", String(page));

    const queryString = query.toString();
    return queryString ? `/transactions?${queryString}` : "/transactions";
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>MONEY ACTIVITY</p>
          <h1>Transactions</h1>
          <p className={styles.subtitle}>
            Track every income and expense in one place.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <a href={exportHref} className={styles.addButton}>
            <Download size={18} />
            Export CSV
          </a>
          <Link href="/transactions/new" className={styles.addButton}>
            <Plus size={18} />
            Add Transaction
          </Link>
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>All Transactions</h2>
            <p>{total} transaction{total === 1 ? "" : "s"}</p>
          </div>
          {hasFilters && (
            <span className={styles.filteredLabel}>Filters applied</span>
          )}
        </div>

        {error ? (
          <div className={styles.emptyState}>
            <strong>Unable to load transactions</strong>
            <span>Make sure the FastAPI backend is running on port 8001.</span>
          </div>
        ) : (
          <>
            <TransactionResults
              transactions={transactions}
              total={total}
              accounts={accounts}
              categories={categories}
            />

            {transactions.length > 0 && totalPages > 1 && (
              <div className={styles.pagination}>
                <div className={styles.paginationSummary}>
                  Page <strong>{safeCurrentPage}</strong> of{" "}
                  <strong>{totalPages}</strong>
                </div>

                <div className={styles.paginationControls}>
                  {safeCurrentPage > 1 ? (
                    <Link
                      href={buildPageUrl(safeCurrentPage - 1)}
                      className={styles.paginationButton}
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className={`${styles.paginationButton} ${styles.paginationDisabled}`}>
                      Previous
                    </span>
                  )}

                  <div className={styles.paginationPages}>
                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .filter((page) => {
                        if (totalPages <= 7) return true;
                        if (page === 1 || page === totalPages) return true;
                        return Math.abs(page - safeCurrentPage) <= 1;
                      })
                      .map((page) => (
                        <Link
                          key={page}
                          href={buildPageUrl(page)}
                          className={
                            page === safeCurrentPage
                              ? `${styles.paginationPage} ${styles.paginationPageActive}`
                              : styles.paginationPage
                          }
                        >
                          {page}
                        </Link>
                      ))}
                  </div>

                  {safeCurrentPage < totalPages ? (
                    <Link
                      href={buildPageUrl(safeCurrentPage + 1)}
                      className={styles.paginationButton}
                    >
                      Next
                    </Link>
                  ) : (
                    <span className={`${styles.paginationButton} ${styles.paginationDisabled}`}>
                      Next
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
