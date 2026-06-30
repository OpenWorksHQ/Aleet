"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { InvestorDocument } from "@/lib/investor-documents-api";
import {
  createInvestorDocument,
  updateInvestorDocument,
} from "@/lib/investor-documents-api";
import { X } from "lucide-react";
import { INVESTOR_DOCUMENT_ACCEPT } from "./investor-file-types";
import { SupportedFileTypes } from "./supported-file-types";

type Props = {
  onClose: () => void;
  onSave: (document: InvestorDocument) => void;
  editing?: InvestorDocument;
};

export function InvestorDocumentModal({ onClose, onSave, editing }: Props) {
  const [label, setLabel] = useState(editing?.label ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [isPublished, setIsPublished] = useState(editing?.isPublished ?? true);
  const [sortOrder, setSortOrder] = useState(String(editing?.sortOrder ?? 0));
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!label.trim()) nextErrors.label = "Tab label is required";
    if (!title.trim()) nextErrors.title = "Document title is required";
    if (!editing && !file) nextErrors.file = "A document file is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setApiError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("label", label.trim());
      formData.append("title", title.trim());
      formData.append("isPublished", String(isPublished));
      formData.append("sortOrder", sortOrder);
      if (file) formData.append("document", file);

      const saved = editing
        ? await updateInvestorDocument(editing._id, formData)
        : await createInvestorDocument(formData);

      onSave(saved);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Failed to save resource",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card-bg p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-text">
            {editing ? "Edit Investor Resource" : "Add Investor Resource"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-border/40 hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {apiError ? (
          <p className="mb-4 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
            {apiError}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Tab Label" error={errors.label}>
            <input
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="e.g. Financials"
              className={inputClass(Boolean(errors.label))}
            />
          </Field>

          <Field label="Document Title" error={errors.title}>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Q1 Cash Flow Statement"
              className={inputClass(Boolean(errors.title))}
            />
          </Field>

          <Field label="Sort Order" hint="Lower numbers appear first">
            <input
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className={inputClass(false)}
            />
          </Field>

          <fieldset>
            <legend className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
              Show on Investor Page
            </legend>
            <div className="flex gap-6">
              {(
                [
                  { value: true, label: "Yes" },
                  { value: false, label: "No" },
                ] as const
              ).map((option) => (
                <label
                  key={String(option.value)}
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-text"
                >
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 shrink-0 rounded-full border",
                      isPublished === option.value
                        ? "border-gold bg-gold"
                        : "border-border bg-transparent",
                    )}
                    aria-hidden
                  />
                  <input
                    type="radio"
                    name="isPublished"
                    checked={isPublished === option.value}
                    onChange={() => setIsPublished(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            label={editing ? "Replace Document (optional)" : "Document File"}
            error={errors.file}
          >
            <input
              type="file"
              accept={INVESTOR_DOCUMENT_ACCEPT}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-page-bg file:px-3 file:py-2 file:text-sm file:text-text"
            />
            <SupportedFileTypes compact />
          </Field>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl border border-gold/30 bg-gold/15 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/25 disabled:opacity-60"
            >
              {isLoading
                ? "Saving..."
                : editing
                  ? "Save Changes"
                  : "Create Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
        {hint ? (
          <span className="normal-case tracking-normal text-muted/80">
            {" "}
            — {hint}
          </span>
        ) : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-xl border bg-page-bg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none",
    hasError ? "border-red-500/60" : "border-border focus:border-gold/50",
  );
}
