"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AuthFooter, AuthMenu } from "../../components/auth-shell";
import { Button, Container, Input, toast } from "../../components/ui";
import { cn } from "@/lib/utils";
import { forgotPassword, resetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import Link from "next/link";

type Step = 1 | 2 | 3 | 4;

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // If the page loads with ?token=..., jump straight to step 3 (set new password)
  useEffect(() => {
    if (searchParams.get("token")) {
      setStep(3);
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col bg-page-bg px-5 pt-6 pb-4.5 text-white sm:px-14 sm:pt-14 sm:pb-6">
      <AuthMenu />

      <div className="flex flex-1 items-center justify-center py-8">
        <main className="w-full">
          <Container className="max-w-140">
            <section className="rounded-3xl border border-[#1e2b2a] bg-[radial-gradient(110%_180%_at_50%_0%,rgba(8,27,25,0.95)_0%,rgba(4,12,11,0.95)_62%)] px-4 py-6 shadow-[0_14px_44px_rgba(0,0,0,0.35)] sm:px-8 sm:py-9">
              <header className="mb-7 text-center sm:mb-8">
                <h1 className="mb-2 text-[30px] leading-[1.1] font-semibold text-white sm:text-[40px]">
                  {step === 1 && "Reset Password"}
                  {step === 2 && "Check Your Email"}
                  {step === 3 && "New Password"}
                  {step === 4 && "All Done!"}
                </h1>
                <p className="text-[14px] font-semibold text-[#a3a8a7] sm:text-[16px]">
                  {step === 1 && "Enter your email to receive a reset link"}
                  {step === 2 && "We sent a reset link to your inbox"}
                  {step === 3 && "Choose your new password"}
                  {step === 4 && "Your password has been updated"}
                </p>
              </header>

              {/* Progress bar */}
              <div className="mb-6 flex items-center gap-2">
                {([1, 2, 3, 4] as const).map((s) => (
                  <div
                    key={s}
                    className={cn(
                      "h-0.75 flex-1 rounded-full transition-colors duration-300",
                      step >= s ? "bg-[#bca066]" : "bg-[#1e2b2c]",
                    )}
                  />
                ))}
              </div>

              <div className="overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  {step === 1 && (
                    <ForgotStep key="step-1" onSuccess={() => setStep(2)} />
                  )}
                  {step === 2 && (
                    <CheckEmailStep key="step-2" />
                  )}
                  {step === 3 && (
                    <ResetStep
                      key="step-3"
                      token={searchParams.get("token") ?? ""}
                      onSuccess={() => setStep(4)}
                    />
                  )}
                  {step === 4 && (
                    <SuccessStep key="step-4" onLogin={() => router.push("/login")} />
                  )}
                </AnimatePresence>
              </div>
            </section>
          </Container>
        </main>
      </div>

      <AuthFooter />
    </div>
  );
}

function ForgotStep({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;

    setIsLoading(true);
    try {
      const res = await forgotPassword({
        email,
        resetBaseUrl: `${window.location.origin}/login/forgot-password`,
        role: "customer",
      });
      toast.success(res.message);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      className="flex flex-col"
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <Input
        id="forgot-email"
        type="email"
        name="email"
        placeholder="your@email.com"
        required
        className="mb-5 h-12.5 border-[#1e2b2c] bg-[#090c0e] px-4 text-[15px] placeholder:text-[#5a5a5e] sm:mb-6 sm:h-14 sm:text-[17px]"
      />
      <Button
        className="mb-5 h-13 text-[17px] sm:mb-6 sm:h-14.5 sm:text-[21px]"
        type="submit"
        isLoading={isLoading}
      >
        Send Reset Link
      </Button>
      <Link
        href="/login"
        className="text-center text-[13px] font-semibold text-[#9ba0a1] transition-colors hover:text-white sm:text-[14px]"
      >
        ← Back to Login
      </Link>
    </motion.form>
  );
}

// ── Step 2: Check email ───────────────────────────────────────────────────────

function CheckEmailStep() {
  return (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0f2a1e]">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#bca066"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>
      <p className="mb-2 text-[15px] font-semibold text-white sm:text-[16px]">
        Check your inbox
      </p>
      <p className="mb-7 text-[13px] leading-relaxed text-[#a3a8a7] sm:text-[14px]">
        We&apos;ve sent a password reset link to your email. Click the link to set a new password.
        The link expires in <span className="text-white">30 minutes</span>.
      </p>
      <Link
        href="/login"
        className="text-[13px] font-semibold text-[#9ba0a1] transition-colors hover:text-white sm:text-[14px]"
      >
        ← Back to Login
      </Link>
    </motion.div>
  );
}

// ── Step 3: Set new password ──────────────────────────────────────────────────

function ResetStep({ token, onSuccess }: { token: string; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!token) {
      toast.error("Reset token is missing. Please use the link from your email.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword({ token, password });
      toast.success(res.message);
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to reset password. The link may have expired.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      className="flex flex-col"
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <Input
        id="reset-password"
        type="password"
        name="password"
        placeholder="New password (min. 8 characters)"
        required
        minLength={8}
        className="mb-4 h-12.5 border-[#1e2b2c] bg-[#090c0e] px-4 text-[15px] placeholder:text-[#5a5a5e] sm:h-14 sm:text-[17px]"
      />
      <Input
        id="reset-confirm-password"
        type="password"
        name="confirmPassword"
        placeholder="Confirm new password"
        required
        minLength={8}
        className="mb-5 h-12.5 border-[#1e2b2c] bg-[#090c0e] px-4 text-[15px] placeholder:text-[#5a5a5e] sm:mb-6 sm:h-14 sm:text-[17px]"
      />
      <Button
        className="mb-5 h-13 text-[17px] sm:mb-6 sm:h-14.5 sm:text-[21px]"
        type="submit"
        isLoading={isLoading}
      >
        Set New Password
      </Button>
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="text-center text-[13px] font-semibold text-[#9ba0a1] transition-colors hover:text-white"
      >
        ← Back to Login
      </button>
    </motion.form>
  );
}

function SuccessStep({ onLogin }: { onLogin: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0f2a1e]">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#bca066"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p className="mb-7 text-[14px] text-[#a3a8a7] sm:text-[15px]">
        Your password has been successfully updated. You can now log in with your new password.
      </p>
      <Button
        className="h-13 w-full text-[17px] sm:h-14.5 sm:text-[21px]"
        type="button"
        onClick={onLogin}
      >
        Go to Login
      </Button>
    </motion.div>
  );
}
