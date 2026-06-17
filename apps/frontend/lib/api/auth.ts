import { apiFetch } from "@/lib/api";

export type User = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "customer" | "driver";
  isPhoneVerified: boolean;
  subscriptionStatus: string;
};

// ── Check if user exists
// POST /auth/check-user  { identifier }  →  { exists, type }

export type CheckUserData = {
  exists: boolean;
  type: "email" | "phone";
};

export function checkUserExists(identifier: string) {
  return apiFetch<CheckUserData>("/auth/check-user", {
    method: "POST",
    body: { identifier, role: "customer" },
  });
}

// ── Login
// POST /auth/login  { identifier, password }  →  { token, user }

export type LoginPayload = {
  identifier: string;
  password: string;
  expectedRole: "customer" | "driver";
};

export type LoginData = {
  token: string;
  user: User;
};

export function login(payload: LoginPayload) {
  return apiFetch<LoginData>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

// ── Signup — Step 1: Start (send OTP)
// POST /auth/signup/start  { identifier }  →  { identifierType, expiresIn }

export type SignupStartPayload = {
  identifier: string;
  role: "customer" | "driver";
};

export type SignupStartData = {
  identifierType: "email" | "phone";
  expiresIn: string;
};

export function signupStart(payload: SignupStartPayload) {
  return apiFetch<SignupStartData>("/auth/signup/start", {
    method: "POST",
    body: payload,
  });
}

// ── Signup — Step 2: Verify OTP
// POST /auth/signup/verify  { identifier, code }  →  { signupToken }

export type SignupVerifyPayload = {
  identifier: string;
  code: string;
};

export type SignupVerifyData = {
  signupToken: string;
};

export function signupVerify(payload: SignupVerifyPayload) {
  return apiFetch<SignupVerifyData>("/auth/signup/verify", {
    method: "POST",
    body: payload,
  });
}

// ── Signup — Step 3: Passcode
// POST /auth/signup/passcode  { signupToken, password }  →  { tempToken }

export type SignupPasscodePayload = {
  signupToken: string;
  password: string;
};

export type SignupPasscodeData = {
  tempToken: string;
};

export function signupPasscode(payload: SignupPasscodePayload) {
  return apiFetch<SignupPasscodeData>("/auth/signup/passcode", {
    method: "POST",
    body: payload,
  });
}

// ── Signup — Step 4: Complete
// POST /auth/signup/complete  { tempToken, name, email }  →  { token, user }

export type SignupCompletePayload = {
  tempToken: string;
  name: string;
  email: string;
};

export type SignupCompleteData = {
  token: string;
  user: User;
};

export function signupComplete(payload: SignupCompletePayload) {
  return apiFetch<SignupCompleteData>("/auth/signup/complete", {
    method: "POST",
    body: payload,
  });
}

// ── Forgot Password

export type ForgotPasswordPayload = {
  email: string;
  resetBaseUrl?: string;
  role: "customer" | "driver";
};

export function forgotPassword(payload: ForgotPasswordPayload) {
  return apiFetch("/auth/password/forgot", {
    method: "POST",
    body: payload,
  });
}

// ── Reset Password

export type ResetPasswordPayload = {
  token: string;
  password: string;
};

export function resetPassword(payload: ResetPasswordPayload) {
  return apiFetch("/auth/password/reset", {
    method: "POST",
    body: payload,
  });
}
