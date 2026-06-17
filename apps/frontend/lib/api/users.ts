import { apiFetch } from "@/lib/api";
import type { User } from "@/lib/api/auth";

export function getProfile(token: string) {
  return apiFetch<User>("/users/profile", {
    method: "GET",
    token,
  });
}
