import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface LoginResult {
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    driver?: { status: string };
  };
}

export interface ProfileResult {
  role: string;
  driver?: { status: string };
}

export async function fetchUserProfile(token: string): Promise<ProfileResult> {
  const res = await fetch(`${BASE_URL}/api/users/profile`, {
    headers: withNgrokHeaders({ Authorization: `Bearer ${token}` }),
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to fetch profile");

  const data = json.data ?? json;
  return {
    role: (data.role ?? "").toLowerCase(),
    driver: data.driver,
  };
}

export async function loginWithIdentifier(
  identifier: string,
  password: string,
): Promise<LoginResult> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: withNgrokHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ identifier, password, expectedRole: "driver" }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message ?? "Login failed");
  }

  // API returns { token, user } directly at the root (not wrapped in `data`)
  const payload = json.data ?? json;

  if (!payload.token || !payload.user) {
    throw new Error(json.message ?? "Login failed");
  }

  return payload as LoginResult;
}
