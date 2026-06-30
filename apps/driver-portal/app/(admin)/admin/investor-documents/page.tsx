import { cookies } from "next/headers";
import { fetchInvestorDocuments } from "@/lib/investor-documents-api";
import type { InvestorDocument } from "@/lib/investor-documents-api";
import { InvestorDocumentsList } from "@/app/components/admin/investor-documents/investor-documents-list";

export default async function InvestorDocumentsPage() {
  const token = (await cookies()).get("auth_token")?.value ?? "";

  let documents: InvestorDocument[] = [];
  let loadError: string | null = null;

  try {
    documents = await fetchInvestorDocuments(token);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Failed to load investor resources";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text sm:text-2xl">
          Investor Resources
        </h1>
        <p className="text-sm text-muted">
          Upload and manage documents shown on the private Teams portal
        </p>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {loadError}
        </p>
      ) : null}

      <InvestorDocumentsList initialDocuments={documents} />
    </div>
  );
}
