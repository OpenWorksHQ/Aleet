import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
console.log("API Base URL, process.env.NEXT_PUBLIC_API_URL:", BASE_URL);

export type ApiResponse<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
  /** Structured error detail on failures (e.g. `eligibility` on a blocked booking). */
  errors?: unknown;
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
  skipAuthRedirect?: boolean;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Structured `errors` payload from the API response, when present. */
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = undefined>(
  path: string,
  { body, token, headers, skipAuthRedirect, ...init }: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...init,
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    if (
      res.status === 401 &&
      !skipAuthRedirect &&
      typeof document !== "undefined" &&
      !path.startsWith("/auth/") &&
      !path.startsWith("/partners/auth/")
    ) {
      // Token expired or invalid — clear it and redirect to login
      document.cookie = "auth_token=; path=/; max-age=0";
      window.location.href = "/login";
    }
    throw new ApiError(res.status, json.message ?? "Unknown error", json.errors);
  }

  return json;
}
