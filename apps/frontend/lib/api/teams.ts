import { withNgrokHeaders } from "@/lib/ngrok-headers";
import { ApiError, type ApiResponse } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type InvestorRole = "investor" | "operator" | "legal" | "other";

export type InvestorDocument = {
  _id: string;
  label: string;
  title: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sortOrder: number;
};

export type InvestorSubmissionPayload = {
  fullName: string;
  role: InvestorRole;
  linkedinOrWebsite?: string;
  background?: string;
  email?: string;
  phoneOrCalendly?: string;
};

async function publicTeamsFetch<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...init,
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      ...init?.headers,
    }),
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new ApiError(res.status, json.message ?? "Unknown error", json.errors);
  }

  return json;
}

/** GET /api/teams/documents — published investor resources (public). */
export function getInvestorDocuments() {
  return publicTeamsFetch<InvestorDocument[]>("/teams/documents", { method: "GET" });
}

/** POST /api/teams/submissions — investor access request (public). */
export function submitInvestorAccessRequest(body: InvestorSubmissionPayload) {
  return publicTeamsFetch("/teams/submissions", { method: "POST", body });
}
