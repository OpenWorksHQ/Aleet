import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type InvestorDocument = {
  _id: string;
  label: string;
  title: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

function getTokenFromCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("auth_token="))
    ?.split("=")[1];
}

function authHeaders(token?: string): HeadersInit {
  const resolvedToken = token ?? getTokenFromCookie();
  return withNgrokHeaders({
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
  });
}

/** GET /api/admin/investor-documents */
export async function fetchInvestorDocuments(token?: string): Promise<InvestorDocument[]> {
  const res = await fetch(`${BASE_URL}/api/admin/investor-documents`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch investor documents");
  }
  return (json.data ?? []) as InvestorDocument[];
}

/** POST /api/admin/investor-documents */
export async function createInvestorDocument(
  formData: FormData,
  token?: string,
): Promise<InvestorDocument> {
  const res = await fetch(`${BASE_URL}/api/admin/investor-documents`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to create investor document");
  }
  return json.data as InvestorDocument;
}

/** PUT /api/admin/investor-documents/:id */
export async function updateInvestorDocument(
  id: string,
  formData: FormData,
  token?: string,
): Promise<InvestorDocument> {
  const res = await fetch(`${BASE_URL}/api/admin/investor-documents/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to update investor document");
  }
  return json.data as InvestorDocument;
}

/** DELETE /api/admin/investor-documents/:id */
export async function deleteInvestorDocument(id: string, token?: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/investor-documents/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to delete investor document");
  }
}
