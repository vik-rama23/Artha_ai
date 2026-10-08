"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createNetWorthItem,
  deleteNetWorthItem,
  getNetWorth,
  getNetWorthItems,
  updateNetWorthItem,
  type NetWorthItem,
  type NetWorthResponse,
} from "@/lib/api/netWorth";

import styles from "./net-worth.module.scss";

function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatMonth(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

function formatCategory(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NetWorthPage() {
  const [data, setData] = useState<NetWorthResponse | null>(null);
  const [items, setItems] = useState<NetWorthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [itemType, setItemType] = useState<"ASSET" | "LIABILITY">("ASSET");
  const [category, setCategory] = useState("PROPERTY");
  const [value, setValue] = useState("");
  const [asOfDate, setAsOfDate] = useState(todayDate);
  const [historyStartDate, setHistoryStartDate] = useState(todayDate);
  const [notes, setNotes] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [netWorth, manualItems] = await Promise.all([
        getNetWorth(),
        getNetWorthItems(),
      ]);

      setData(netWorth);
      setItems(manualItems);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load net worth."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const netWorthChangeLabel = useMemo(() => {
    if (!data) return "";
    if (Number(data.net_worth_change) > 0) return "up";
    if (Number(data.net_worth_change) < 0) return "down";
    return "flat";
  }, [data]);

  function resetForm() {
    const today = todayDate();

    setName("");
    setItemType("ASSET");
    setCategory("PROPERTY");
    setValue("");
    setAsOfDate(today);
    setHistoryStartDate(today);
    setNotes("");
    setEditingItemId(null);
    setShowForm(false);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(item: NetWorthItem) {
    setName(item.name);
    setItemType(item.item_type);
    setCategory(item.category);
    setValue(item.value);
    setAsOfDate(item.as_of_date);
    setHistoryStartDate(item.history_start_date);
    setNotes(item.notes ?? "");
    setEditingItemId(item.id);
    setError(null);
    setShowForm(true);
  }

  function handleTypeChange(nextType: "ASSET" | "LIABILITY") {
    setItemType(nextType);
    setCategory(nextType === "ASSET" ? "PROPERTY" : "HOME_LOAN");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericValue = Number(value);

    if (!name.trim() || !numericValue || numericValue <= 0) {
      setError("Enter a name and a value greater than zero.");
      return;
    }

    if (historyStartDate > asOfDate) {
      setError("Track from date cannot be after the as-of date.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: name.trim(),
        item_type: itemType,
        category,
        value: numericValue,
        as_of_date: asOfDate,
        history_start_date: historyStartDate,
        notes: notes.trim() || null,
      };

      if (editingItemId) {
        await updateNetWorthItem(editingItemId, payload);
      } else {
        await createNetWorthItem(payload);
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingItemId
            ? "Unable to update this item."
            : "Unable to save this item."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: NetWorthItem) {
    if (deletingId) return;

    try {
      setDeletingId(item.id);
      setError(null);

      await deleteNetWorthItem(item.id);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete this item."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && !data) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <Loader2 size={20} className={styles.spinner} />
          Loading net worth...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>WEALTH OVERVIEW</p>
          <h1>Net Worth</h1>
          <p className={styles.subtitle}>
            See what you own, what you owe, and how your wealth is changing.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={openCreateForm}
        >
          <Plus size={17} />
          Add asset or liability
        </button>
      </section>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {data && (
        <>
          <section className={styles.heroGrid}>
            <article className={styles.netWorthCard}>
              <div className={styles.cardLabel}>Total net worth</div>
              <strong className={styles.netWorthValue}>
                {formatCurrency(data.net_worth)}
              </strong>

              <div
                className={
                  `${styles.change} ${styles[`change${netWorthChangeLabel}`]}`
                }
              >
                {netWorthChangeLabel === "up" ? (
                  <ArrowUpRight size={16} />
                ) : netWorthChangeLabel === "down" ? (
                  <ArrowDownRight size={16} />
                ) : (
                  <Minus size={16} />
                )}
                <span>
                  {formatCurrency(
                    Math.abs(Number(data.net_worth_change))
                  )}{" "}
                  vs last month
                </span>
              </div>
            </article>

            <article className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <Wallet size={19} />
              </div>
              <span>Total assets</span>
              <strong>{formatCurrency(data.total_assets)}</strong>
              <small>
                {Number(data.asset_change) >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(Number(data.asset_change)))} vs last month
              </small>
            </article>

            <article className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <Landmark size={19} />
              </div>
              <span>Total liabilities</span>
              <strong>{formatCurrency(data.total_liabilities)}</strong>
              <small>
                {Number(data.liability_change) >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(Number(data.liability_change)))} vs last month
              </small>
            </article>
          </section>

          <section className={styles.mainGrid}>
            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>Net worth trend</h2>
                  <p>Last 12 months</p>
                </div>
              </div>

              <div className={styles.history}>
                {data.history.map((point) => {
                  const max = Math.max(
                    ...data.history.map((item) =>
                      Math.abs(Number(item.net_worth))
                    ),
                    1
                  );
                  const width =
                    (Math.abs(Number(point.net_worth)) / max) * 100;

                  return (
                    <div key={point.month} className={styles.historyRow}>
                      <span>{formatMonth(point.month)}</span>
                      <div className={styles.historyTrack}>
                        <div
                          className={styles.historyBar}
                          style={{ width: `${Math.max(width, 2)}%` }}
                        />
                      </div>
                      <strong>{formatCurrency(point.net_worth)}</strong>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>Wealth breakdown</h2>
                  <p>Accounts plus manually tracked items</p>
                </div>
              </div>

              <div className={styles.breakdownColumns}>
                <div>
                  <h3>Assets</h3>
                  {data.asset_items.length === 0 ? (
                    <p className={styles.emptyInline}>No assets yet.</p>
                  ) : (
                    data.asset_items.map((item) => (
                      <div
                        key={`${item.source}-asset-${item.name}-${item.category}`}
                        className={styles.breakdownRow}
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {formatCategory(item.category)} · {item.source.toLowerCase()}
                          </span>
                        </div>
                        <strong>{formatCurrency(item.value)}</strong>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <h3>Liabilities</h3>
                  {data.liability_items.length === 0 ? (
                    <p className={styles.emptyInline}>No liabilities yet.</p>
                  ) : (
                    data.liability_items.map((item) => (
                      <div
                        key={`${item.source}-liability-${item.name}-${item.category}`}
                        className={styles.breakdownRow}
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {formatCategory(item.category)} · {item.source.toLowerCase()}
                          </span>
                        </div>
                        <strong>{formatCurrency(item.value)}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Manual assets & liabilities</h2>
                <p>
                  Track current values and when they should start appearing in
                  your net worth history.
                </p>
              </div>
            </div>

            {items.length === 0 ? (
              <div className={styles.emptyState}>
                <Wallet size={22} />
                <strong>No manual items yet</strong>
                <span>
                  Your bank, cash and credit-card accounts are included automatically.
                </span>
              </div>
            ) : (
              <div className={styles.itemList}>
                {items.map((item) => (
                  <div key={item.id} className={styles.itemRow}>
                    <div className={styles.itemIdentity}>
                      <div className={styles.itemIcon}>
                        {item.item_type === "ASSET" ? (
                          <ArrowUpRight size={16} />
                        ) : (
                          <ArrowDownRight size={16} />
                        )}
                      </div>
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {formatCategory(item.category)} · value as of {item.as_of_date}
                          {" · "}history from {item.history_start_date}
                        </span>
                      </div>
                    </div>

                    <strong
                      className={
                        item.item_type === "ASSET"
                          ? styles.assetAmount
                          : styles.liabilityAmount
                      }
                    >
                      {formatCurrency(item.value)}
                    </strong>

                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => openEditForm(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        className={styles.deleteButton}
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item)}
                        aria-label={`Delete ${item.name}`}
                      >
                        {deletingId === item.id ? (
                          <Loader2 size={16} className={styles.spinner} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showForm && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>WEALTH ITEM</p>
                <h2>
                  {editingItemId
                    ? "Edit asset or liability"
                    : "Add asset or liability"}
                </h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={resetForm}
                disabled={saving}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <label>
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Home, PPF, Home Loan"
                  maxLength={150}
                  required
                />
              </label>

              <div className={styles.formGrid}>
                <label>
                  Type
                  <select
                    value={itemType}
                    onChange={(event) =>
                      handleTypeChange(
                        event.target.value as "ASSET" | "LIABILITY"
                      )
                    }
                  >
                    <option value="ASSET">Asset</option>
                    <option value="LIABILITY">Liability</option>
                  </select>
                </label>

                <label>
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {itemType === "ASSET" ? (
                      <>
                        <option value="PROPERTY">Property</option>
                        <option value="INVESTMENT">Investment</option>
                        <option value="FD">Fixed Deposit</option>
                        <option value="PPF">PPF</option>
                        <option value="GOLD">Gold</option>
                        <option value="VEHICLE">Vehicle</option>
                        <option value="OTHER">Other</option>
                      </>
                    ) : (
                      <>
                        <option value="HOME_LOAN">Home Loan</option>
                        <option value="CAR_LOAN">Car Loan</option>
                        <option value="PERSONAL_LOAN">Personal Loan</option>
                        <option value="CREDIT_CARD">Credit Card</option>
                        <option value="OTHER">Other</option>
                      </>
                    )}
                  </select>
                </label>
              </div>

              <div className={styles.formGrid}>
                <label>
                  Current value
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="0.00"
                    required
                  />
                </label>

                <label>
                  Value as of
                  <input
                    type="date"
                    value={asOfDate}
                    onChange={(event) => setAsOfDate(event.target.value)}
                    required
                  />
                </label>
              </div>

              <label>
                Include in history from
                <input
                  type="date"
                  value={historyStartDate}
                  max={asOfDate}
                  onChange={(event) => setHistoryStartDate(event.target.value)}
                  required
                />
                <span className={styles.fieldHint}>
                  Use the date you want this current value to start appearing
                  in the 12-month net worth history. For example, set your
                  Home to the date you started tracking or owned it.
                </span>
              </label>

              <label>
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional"
                  rows={3}
                />
              </label>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      Saving...
                    </>
                  ) : editingItemId ? (
                    "Save changes"
                  ) : (
                    "Add item"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
