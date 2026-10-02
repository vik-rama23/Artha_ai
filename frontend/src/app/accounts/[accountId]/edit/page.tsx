"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AccountForm from "@/components/accounts/AccountForm";
import {
  getAccount,
  type Account,
} from "@/lib/api/accounts";

import styles from "./edit-account.module.scss";

export default function EditAccountPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [account, setAccount] = useState<Account | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccount() {
      try {
        setLoading(true);
        setError(null);

        const data = await getAccount(accountId);

        setAccount(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load account."
        );
      } finally {
        setLoading(false);
      }
    }

    if (accountId) {
      loadAccount();
    }
  }, [accountId]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            Loading account...
          </div>
        </div>
      </main>
    );
  }

  if (error || !account) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <Link
            href="/accounts"
            className={styles.backLink}
          >
            <ArrowLeft size={17} />
            Back to Accounts
          </Link>

          <div className={styles.error}>
            <h1>Unable to load account</h1>

            <p>
              {error ?? "The requested account was not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link
          href="/accounts"
          className={styles.backLink}
        >
          <ArrowLeft size={17} />
          Back to Accounts
        </Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              FINANCIAL ACCOUNTS
            </p>

            <h1>Edit Account</h1>

            <p className={styles.subtitle}>
              Update the details for{" "}
              <strong>{account.name}</strong>.
            </p>
          </div>
        </header>

        <AccountForm
          mode="edit"
          accountId={account.id}
          initialValues={{
            name: account.name,
            account_type: account.account_type,
            institution_name:
              account.institution_name,
            account_number_last4:
              account.account_number_last4,
            opening_balance: Number(
              account.opening_balance
            ),
            currency: account.currency,
            notes: account.notes,
          }}
        />
      </div>
    </main>
  );
}