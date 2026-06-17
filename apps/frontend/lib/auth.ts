export const TOKEN_COOKIE = "auth_token";

export function setToken(token: string): void {
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function removeToken(): void {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}
