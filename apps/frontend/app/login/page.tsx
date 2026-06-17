"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { AuthFooter, AuthMenu } from "../components/auth-shell";
import { Container, toast } from "../components/ui";
import { cn } from "@/lib/utils";
import {
  checkUserExists,
  login,
  signupStart,
  signupVerify,
  signupPasscode,
  signupComplete,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";
import {
  IdentifierStep,
  PasswordStep,
  PhoneStep,
  OtpStep,
  PasscodeStep,
  CompleteStep,
} from "../components/auth";

type Step =
  | "identifier"  // Step 1:  enter phone or email
  | "phone"       // Step 1b: email entered → ask for phone number
  | "password"    // Step 2a: existing user — enter password
  | "otp"         // Step 2b: new user — verify OTP
  | "passcode"    // Step 3b: new user — set password
  | "complete";   // Step 4b: new user — name + email


export default function LoginPage() {
  return (
    <Suspense>
      <AuthFlow />
    </Suspense>
  );
}

const HEADINGS: Record<Step, { title: string; subtitle: string }> = {
  identifier: { title: "Welcome", subtitle: "Enter your phone number or email" },
  phone: { title: "Phone Number", subtitle: "Enter your phone number to receive a code" },
  password: { title: "Welcome Back", subtitle: "Enter your password to continue" },
  otp: { title: "Verify", subtitle: "Enter the code we just sent you" },
  passcode: { title: "Set Password", subtitle: "Choose a password for your account" },
  complete: { title: "Almost Done", subtitle: "Tell us a bit about yourself" },
};

const PROGRESS: Record<Step, [number, number]> = {
  identifier: [0, 0],
  phone: [0, 0],
  password: [1, 2],
  otp: [1, 3],
  passcode: [2, 3],
  complete: [3, 3],
};

function AuthFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("identifier");
  const [isLoading, setIsLoading] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [emailForComplete, setEmailForComplete] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [tempToken, setTempToken] = useState("");

  // ── Step 1: Identifier
  const handleIdentifier = async (value: string) => {
    setIsLoading(true);
    try {
      const res = await checkUserExists(value);
      setIdentifier(value);
      if (res.data!.exists) {
        setStep("password");
      } else {
        // Email entered → collect phone first before sending OTP
        const isEmail = value.includes("@");
        if (isEmail) {
          setEmailForComplete(value);
          setStep("phone");
        } else {
          await signupStart({ identifier: value, role: "customer" });
          toast.success("Verification code sent!");
          setStep("otp");
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 1b: Phone (only when email was entered first)
  const handlePhone = async (phone: string) => {
    setIsLoading(true);
    try {
      setIdentifier(phone);
      await signupStart({ identifier: phone, role: "customer" });
      toast.success("Verification code sent!");
      setStep("otp");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2a: Password 
  const handlePassword = async (password: string) => {
    setIsLoading(true);
    try {
      const res = await login({ identifier, password, expectedRole: "customer" });
      setToken(res.data!.token);
      toast.success(res.message);
      router.push(searchParams.get("next") ?? "/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid password.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2b: OTP ─────
  const handleOtp = async (code: string) => {
    setIsLoading(true);
    try {
      const res = await signupVerify({ identifier, code });
      setSignupToken(res.data!.signupToken);
      setStep("passcode");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid code.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3b: Passcode 
  const handlePasscode = async (password: string) => {
    setIsLoading(true);
    try {
      const res = await signupPasscode({ signupToken, password });
      setTempToken(res.data!.tempToken);
      setStep("complete");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 4b: Complete 
  const handleComplete = async (name: string, email: string) => {
    setIsLoading(true);
    try {
      const res = await signupComplete({
        tempToken,
        name,
        email: email,
      });
      setToken(res.data!.token);
      toast.success(res.message);
      router.push(searchParams.get("next") ?? "/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Sign up failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const { title, subtitle } = HEADINGS[step];
  const [progress, total] = PROGRESS[step];
  const showProgress = total > 0;

  return (
    <div className="flex min-h-screen flex-col bg-page-bg px-5 pt-6 pb-4.5 text-white sm:px-14 sm:pt-14 sm:pb-6">
      <AuthMenu />

      <div className="flex flex-1 items-center justify-center py-8">
        <main className="w-full">
          <Container className="max-w-140">
            <section className="rounded-3xl border border-[#1e2b2a] bg-[radial-gradient(110%_180%_at_50%_0%,rgba(8,27,25,0.95)_0%,rgba(4,12,11,0.95)_62%)] px-4 py-6 shadow-[0_14px_44px_rgba(0,0,0,0.35)] sm:px-8 sm:py-9">

              <header className="mb-7 text-center sm:mb-8">
                <h1 className="mb-2 text-[30px] leading-[1.1] font-semibold text-white sm:text-[40px]">
                  {title}
                </h1>
                <p className="text-[14px] font-semibold text-[#a3a8a7] sm:text-[16px]">
                  {subtitle}
                </p>
              </header>

              {showProgress && (
                <div className="mb-6 flex items-center gap-2">
                  {Array.from({ length: total }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-0.75 flex-1 rounded-full transition-colors duration-300",
                        i < progress ? "bg-[#bca066]" : "bg-[#1e2b2c]",
                      )}
                    />
                  ))}
                </div>
              )}

              <div className="overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  {step === "identifier" && (
                    <IdentifierStep
                      key="identifier"
                      isLoading={isLoading}
                      onSubmit={handleIdentifier}
                    />
                  )}
                  {step === "phone" && (
                    <PhoneStep
                      key="phone"
                      isLoading={isLoading}
                      onSubmit={handlePhone}
                      onBack={() => setStep("identifier")}
                    />
                  )}
                  {step === "password" && (
                    <PasswordStep
                      key="password"
                      identifier={identifier}
                      isLoading={isLoading}
                      onSubmit={handlePassword}
                      onBack={() => setStep("identifier")}
                    />
                  )}
                  {step === "otp" && (
                    <OtpStep
                      key="otp"
                      identifier={identifier}
                      isLoading={isLoading}
                      onSubmit={handleOtp}
                      onBack={() => setStep(emailForComplete ? "phone" : "identifier")}
                    />
                  )}
                  {step === "passcode" && (
                    <PasscodeStep
                      key="passcode"
                      isLoading={isLoading}
                      onSubmit={handlePasscode}
                      onBack={() => setStep("otp")}
                    />
                  )}
                  {step === "complete" && (
                    <CompleteStep
                      key="complete"
                      isLoading={isLoading}
                      defaultEmail={emailForComplete}
                      onSubmit={handleComplete}
                      onBack={() => setStep("passcode")}
                    />
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
