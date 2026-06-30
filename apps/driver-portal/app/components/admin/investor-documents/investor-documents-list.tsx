"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { InvestorDocument } from "@/lib/investor-documents-api";
import { deleteInvestorDocument } from "@/lib/investor-documents-api";
import { ConfirmModal } from "@/app/components/ui/confirm-modal";
import { toast } from "@/app/components/ui/toast";
import { InvestorDocumentModal } from "./investor-document-modal";

type Props = {
  initialDocuments: InvestorDocument[];
};

function sortDocuments(docs: InvestorDocument[]): InvestorDocument[] {
  return [...docs].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function InvestorDocumentsList({ initialDocuments }: Props) {
  const [documents, setDocuments] = useState(() => sortDocuments(initialDocuments));
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<InvestorDocument | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(saved: InvestorDocument) {
    if (editingDocument) {
      setDocuments((prev) =>
        sortDocuments(
          prev.map((doc) => (doc._id === saved._id ? saved : doc)),
        ),
      );
      setEditingDocument(null);
      toast.success("Investor resource updated");
    } else {
      setDocuments((prev) => sortDocuments([...prev, saved]));
      toast.success("Investor resource created");
    }
    setShowModal(false);
  }

  function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);

    startTransition(async () => {
      try {
        await deleteInvestorDocument(id);
        setDocuments((prev) => prev.filter((doc) => doc._id !== id));
        toast.success("Investor resource deleted");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete resource",
        );
      }
    });
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-4",
          isPending && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Manage investor page resources.</p>
          <button
            type="button"
            onClick={() => {
              setEditingDocument(null);
              setShowModal(true);
            }}
            className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Add Resource
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card-bg">
          <div className="grid grid-cols-[1fr_1fr_120px_120px_88px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
            <span>Tab Label</span>
            <span>Document Title</span>
            <span>Published</span>
            <span>File</span>
            <span className="text-right">Actions</span>
          </div>

          {documents.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted">
              No investor resources yet. Add one to show buttons on the Teams
              portal.
            </div>
          ) : (
            documents.map((document) => (
              <div
                key={document._id}
                className="grid grid-cols-[1fr_1fr_120px_120px_88px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="text-sm font-medium text-text">
                  {document.label}
                </span>
                <span className="text-sm text-muted">{document.title}</span>
                <span
                  className={cn(
                    "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium",
                    document.isPublished
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-border/40 text-muted",
                  )}
                >
                  {document.isPublished ? "Yes" : "No"}
                </span>
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm text-gold hover:underline"
                >
                  View
                </a>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDocument(document);
                      setShowModal(true);
                    }}
                    className="rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-border/40 hover:text-text"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(document._id)}
                    className="rounded-lg px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal ? (
        <InvestorDocumentModal
          editing={editingDocument ?? undefined}
          onClose={() => {
            setShowModal(false);
            setEditingDocument(null);
          }}
          onSave={handleSave}
        />
      ) : null}

      {deleteConfirmId ? (
        <ConfirmModal
          title="Delete investor resource?"
          description="This removes the file and hides it from the Teams portal."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
        />
      ) : null}
    </>
  );
}
