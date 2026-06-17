import { ForgotPasswordForm } from "@/app/components/auth/forgot-password-form";
import Footer from "@/app/components/footer";
import { TextLink } from "@/app/components/ui/text-link";
import Image from "next/image";

export const metadata = {
    title: "Forgot Password — Aleet",
};

export default function ForgotPasswordPage() {
    return (
        <div className="flex min-h-screen flex-col bg-page-bg">
            <main className="flex flex-1 items-center justify-center px-4 pt-10">
                <div className="w-full max-w-105 rounded-3xl border border-border bg-card-bg px-4 pt-6 shadow-[0_4px_24px_rgba(0,0,0,0.1)] dark:shadow-[0_14px_44px_rgba(0,0,0,0.35)] sm:px-8 sm:py-9">

                    {/* Logo */}
                    <div className="mb-6 flex flex-col items-center gap-2">
                        <Image src="/logo.png" alt="Aleet" width={56} height={56} className="h-22 w-22 object-contain" />
                    </div>

                    <h1 className="text-center text-2xl font-bold text-text mb-2">
                        Forgot your password?
                    </h1>
                    <p className="text-center text-sm text-muted mb-6">
                        Enter your email and we&apos;ll send you a reset link.
                    </p>

                    <ForgotPasswordForm />

                    <p className="mt-8 text-center text-sm text-muted">
                        Remembered it?{" "}
                        <TextLink href="/login" className="text-gold">
                            Back to sign in
                        </TextLink>
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
