"use client";

import { useState, useEffect, Suspense, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { AuthPageShell } from "../components/auth-page-shell";
import { toast } from "../components/ui";
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
  | "identifier"
  | "phone"
  | "password"
  | "otp"
  | "passcode"
  | "complete";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthFlow />
    </Suspense>
  );
}

const HEADINGS: Record<Step, { title: string; subtitle: string }> = {
  identifier: { title: "Welcome", subtitle: "Enter your phone number or email to continue" },
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

const SHELL_COPY: Record<Step, { eyebrow: string; title: ReactNode; subtitle: string }> = {
  identifier: {
    eyebrow: "Member Access",
    title: (
      <>
        Transportation and services that fit{" "}
        <em className="font-serif not-italic text-aleet-gold" style={{ fontStyle: "italic" }}>
          your life.
        </em>
      </>
    ),
    subtitle:
      "Sign in or create your account to book premium transportation, event access, and concierge services.",
  },
  phone: {
    eyebrow: "Member Access",
    title: "One more step.",
    subtitle: "Add your phone number so we can verify your account securely.",
  },
  password: {
    eyebrow: "Welcome Back",
    title: "Good to see you again.",
    subtitle: "Enter your password to access your bookings, membership, and account settings.",
  },
  otp: {
    eyebrow: "Verification",
    title: "Confirm it’s you.",
    subtitle: "Enter the verification code we sent to keep your account secure.",
  },
  passcode: {
    eyebrow: "Create Account",
    title: "Secure your account.",
    subtitle: "Choose a password to protect your membership and booking history.",
  },
  complete: {
    eyebrow: "Create Account",
    title: "Finish setting up.",
    subtitle: "Tell us a little about yourself so we can personalize your experience.",
  },
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

  const handleIdentifier = async (value: string) => {
    setIsLoading(true);
    try {
      const res = await checkUserExists(value);
      setIdentifier(value);
      if (res.data!.exists) {
        setStep("password");
      } else {
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
  const shellCopy = SHELL_COPY[step];
  const [progress, total] = PROGRESS[step];
  const showProgress = total > 0;

  return (
    <AuthPageShell
      eyebrow={shellCopy.eyebrow}
      title={shellCopy.title}
      subtitle={shellCopy.subtitle}
    >
      <header className="mb-6 text-center sm:mb-7">
        <h2 className="font-serif text-[28px] leading-[1.1] text-aleet-text sm:text-[32px]">
          {title}
        </h2>
        <p className="mt-2 text-[14px] text-aleet-text-muted sm:text-[15px]">
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
                i < progress ? "bg-aleet-gold" : "bg-aleet-border",
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
    </AuthPageShell>
  );
}
