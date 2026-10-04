"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  getRecurringTransaction,
} from "@/lib/api/recurringTransactions";

import type {
  RecurringTransaction,
} from "@/types/recurringTransaction";

import RecurringTransactionForm from "../../RecurringTransactionForm";

export default function EditRecurringTransactionPage() {
  const params = useParams<{
    id: string;
  }>();

  const recurringTransactionId = params.id;

  const [
    recurringTransaction,
    setRecurringTransaction,
  ] = useState<RecurringTransaction | null>(
    null,
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!recurringTransactionId) {
      return;
    }

    let active = true;

    async function loadRecurringTransaction() {
      try {
        setLoading(true);
        setError(null);

        const response =
          await getRecurringTransaction(
            recurringTransactionId,
          );

        if (!active) {
          return;
        }

        setRecurringTransaction(response);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load recurring transaction.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRecurringTransaction();

    return () => {
      active = false;
    };
  }, [recurringTransactionId]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "#747d76",
          fontSize: "14px",
        }}
      >
        Loading recurring transaction...
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            padding: "24px",
            border: "1px solid #e6b8b0",
            borderRadius: "16px",
            background: "#fff4f1",
            color: "#a33b2e",
          }}
        >
          <strong>
            Unable to load recurring transaction
          </strong>

          <p
            style={{
              marginBottom: 0,
              marginTop: "8px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!recurringTransaction) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "#747d76",
          fontSize: "14px",
        }}
      >
        Recurring transaction not found.
      </main>
    );
  }

  return (
    <RecurringTransactionForm
      mode="edit"
      recurringTransactionId={
        recurringTransactionId
      }
      initialRecurringTransaction={
        recurringTransaction
      }
    />
  );
}