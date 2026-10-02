import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AccountForm from "@/components/accounts/AccountForm";

import styles from "./new-account.module.scss";

export default function NewAccountPage() {
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

            <h1>Add Account</h1>

            <p className={styles.subtitle}>
              Add a bank account, cash account, card or
              investment account to Artha.
            </p>
          </div>
        </header>

        <AccountForm />
      </div>
    </main>
  );
}