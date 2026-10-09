"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileUp, LoaderCircle, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { apiClient } from "@/lib/api/client";

import styles from "./import.module.scss";

type FieldKey = "transaction_date" | "transaction_type" | "amount" | "account" | "category" | "merchant" | "description" | "notes";
type Mapping = Record<FieldKey, string>;
type PreviewRow = {
  row_number: number;
  transaction_date: string;
  transaction_type: string;
  amount: string;
  account: string;
  account_id: string | null;
  category: string;
  category_id: string | null;
  merchant: string | null;
  description: string | null;
  notes: string | null;
  errors: string[];
  valid: boolean;
  duplicate: boolean;
};
type PreviewResponse = { total_rows: number; valid_rows: number; skipped_rows: number; rows: PreviewRow[] };
type ConfirmResponse = { imported_count: number; skipped_count: number; message: string };

const fields: { key: FieldKey; label: string; required: boolean; aliases: string[] }[] = [
  { key: "transaction_date", label: "Transaction date", required: true, aliases: ["transaction_date", "date", "transaction date", "posted date"] },
  { key: "transaction_type", label: "Type (INCOME/EXPENSE)", required: true, aliases: ["transaction_type", "type", "transaction type", "flow"] },
  { key: "amount", label: "Amount", required: true, aliases: ["amount", "transaction amount", "value"] },
  { key: "account", label: "Account name", required: true, aliases: ["account", "account name", "account_name", "bank account"] },
  { key: "category", label: "Category", required: false, aliases: ["category", "category name", "category_name"] },
  { key: "merchant", label: "Merchant", required: false, aliases: ["merchant", "payee", "counterparty"] },
  { key: "description", label: "Description", required: false, aliases: ["description", "narration", "details", "particulars"] },
  { key: "notes", label: "Notes", required: false, aliases: ["notes", "note", "remarks"] },
];

function firstCsvLine(content: string): string {
  let quoted = false;
  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === '"') {
      if (quoted && content[i + 1] === '"') i += 1;
      else quoted = !quoted;
    } else if ((content[i] === "\n" || content[i] === "\r") && !quoted) {
      return content.slice(0, i);
    }
  }
  return content;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

function detectMapping(headers: string[]): Mapping {
  const normalized = headers.map((header) => header.trim().toLowerCase().replace(/^\ufeff/, ""));
  const result = {} as Mapping;
  for (const field of fields) {
    const index = normalized.findIndex((header) => field.aliases.includes(header));
    result[field.key] = index >= 0 ? headers[index] : "";
  }
  return result;
}

export default function ImportTransactionsPage() {
  const [fileName, setFileName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({
    transaction_date: "", transaction_type: "", amount: "", account: "",
    category: "", merchant: "", description: "", notes: "",
  });
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requiredMapped = useMemo(
    () => fields.filter((field) => field.required).every((field) => Boolean(mapping[field.key])),
    [mapping],
  );

  async function handleFileChange(file?: File) {
    setError(null);
    setSuccess(null);
    setPreview(null);
    setCsvContent("");
    setHeaders([]);
    setFileName("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a CSV file (.csv).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("CSV file must be 2 MB or smaller.");
      return;
    }
    try {
      const content = await file.text();
      const headerLine = firstCsvLine(content.replace(/^\ufeff/, ""));
      const parsedHeaders = splitCsvLine(headerLine);
      if (!parsedHeaders.length || parsedHeaders.some((header) => !header)) {
        setError("The first row must contain non-empty column names.");
        return;
      }
      setCsvContent(content);
      setHeaders(parsedHeaders);
      setMapping(detectMapping(parsedHeaders));
      setFileName(file.name);
    } catch {
      setError("Unable to read this file. Please choose another CSV.");
    }
  }

  async function handlePreview() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPreview(null);
    try {
      const result = await apiClient<PreviewResponse>("/api/v1/transactions/import/preview", {
        method: "POST",
        body: JSON.stringify({ csv_content: csvContent, mapping }),
      });
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview this CSV.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview || preview.valid_rows === 0) return;
    const confirmed = window.confirm(
      `Import ${preview.valid_rows} valid transaction(s)? ${preview.skipped_rows} invalid or duplicate row(s) will be skipped.`,
    );
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiClient<ConfirmResponse>("/api/v1/transactions/import/confirm", {
        method: "POST",
        body: JSON.stringify({ csv_content: csvContent, mapping }),
      });
      setSuccess(result.message + ` ${result.skipped_count} row(s) skipped.`);
      setPreview(null);
      setCsvContent("");
      setHeaders([]);
      setFileName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to import transactions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/transactions" className={styles.backLink}><ArrowLeft size={16} /> Transactions</Link>
          <p className={styles.eyebrow}>PHASE 7 · DATA IMPORT</p>
          <h1>Import transactions</h1>
          <p className={styles.subtitle}>Upload a CSV, map its columns, review validation results, then confirm the import.</p>
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.stepHeading}><span>1</span><div><h2>Choose your CSV file</h2><p>CSV only · Up to 2 MB · Maximum 5,000 rows</p></div></div>
        <label className={styles.dropzone}>
          <FileUp size={30} />
          <strong>{fileName || "Choose a CSV file"}</strong>
          <span>{fileName ? "Select another file to replace it" : "Select a bank statement or exported transaction CSV"}</span>
          <input type="file" accept=".csv,text/csv" onChange={(event) => void handleFileChange(event.target.files?.[0])} />
        </label>
        {headers.length > 0 && (
          <>
            <div className={styles.stepHeading}><span>2</span><div><h2>Map your columns</h2><p>We auto-detect common headings. Confirm the required fields.</p></div></div>
            <div className={styles.mappingGrid}>
              {fields.map((field) => (
                <label key={field.key} className={styles.field}>
                  <span>{field.label}{field.required ? " *" : " (optional)"}</span>
                  <select value={mapping[field.key]} onChange={(event) => {
                    setMapping((current) => ({ ...current, [field.key]: event.target.value }));
                    setPreview(null);
                  }}>
                    <option value="">Do not map</option>
                    {headers.map((header, index) => <option key={`${header}-${index}`} value={header}>{header}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className={styles.mappingNote}>Date format: YYYY-MM-DD. Type must be INCOME or EXPENSE. Account names must match an account in Artha. Categories are optional and must match an active category of the same type.</p>
            <button className={styles.primaryButton} type="button" disabled={!requiredMapped || loading} onClick={() => void handlePreview()}>
              {loading ? <LoaderCircle size={18} className={styles.spin} /> : <Upload size={18} />}
              {loading ? "Validating CSV…" : "Preview import"}
            </button>
          </>
        )}
        {error && <div role="alert" className={styles.error}>{error}</div>}
        {success && <div role="status" className={styles.success}><CheckCircle2 size={18} />{success}<Link href="/transactions">View transactions</Link></div>}
      </section>

      {preview && (
        <section className={styles.card}>
          <div className={styles.stepHeading}><span>3</span><div><h2>Review before importing</h2><p>Only valid, non-duplicate rows will be saved. Nothing is saved until you confirm.</p></div></div>
          <div className={styles.summary}>
            <div><strong>{preview.total_rows}</strong><span>Total rows</span></div>
            <div className={styles.validStat}><strong>{preview.valid_rows}</strong><span>Ready to import</span></div>
            <div className={styles.skipStat}><strong>{preview.skipped_rows}</strong><span>Will be skipped</span></div>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Row</th><th>Date</th><th>Type</th><th>Amount</th><th>Account</th><th>Category</th><th>Description / merchant</th><th>Validation</th></tr></thead>
              <tbody>
                {preview.rows.slice(0, 100).map((row) => (
                  <tr key={row.row_number}>
                    <td>{row.row_number}</td><td>{row.transaction_date}</td><td>{row.transaction_type}</td><td>{row.amount}</td><td>{row.account}</td><td>{row.category}</td><td>{row.description || row.merchant || "—"}</td>
                    <td><span className={row.valid ? styles.validBadge : styles.invalidBadge}>{row.valid ? "Ready" : row.duplicate ? "Duplicate" : "Skipped"}</span>{row.errors.length > 0 && <ul>{row.errors.map((item, index) => <li key={index}>{item}</li>)}</ul>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 100 && <p className={styles.mappingNote}>Showing first 100 of {preview.rows.length} rows. All rows are included in the totals and import.</p>}
          <div className={styles.footerActions}>
            <button className={styles.secondaryButton} type="button" disabled={saving} onClick={() => setPreview(null)}>Back to mapping</button>
            <button className={styles.primaryButton} type="button" disabled={saving || preview.valid_rows === 0} onClick={() => void handleImport()}>
              {saving ? <LoaderCircle size={18} className={styles.spin} /> : <CheckCircle2 size={18} />}
              {saving ? "Importing…" : `Import ${preview.valid_rows} transaction(s)`}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
