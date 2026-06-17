import AuthForm from "@/app/components/auth/auth-form";
import Footer from "@/app/components/footer";
import { TextLink } from "@/app/components/ui/text-link";
import Image from "next/image";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col bg-page-bg">
            <main className="flex flex-1 items-center justify-center px-4 pt-10">
                <div className="w-full max-w-105 rounded-3xl border border-border bg-card-bg px-4 pt-6 shadow-[0_4px_24px_rgba(0,0,0,0.1)] dark:shadow-[0_14px_44px_rgba(0,0,0,0.35)] sm:px-8 sm:py-9">

                    {/* Logo */}
                    <div className="mb-6 flex flex-col items-center gap-2">
                        <Image src="/logo.png" alt="Aleet" width={56} height={56} className="h-22 w-22 object-contain" />
                    </div>

                    <h1 className="text-center text-2xl font-bold text-text mb-4">
                        Sign in to your account
                    </h1>

                    <AuthForm />

                    <p className="mt-8 text-center text-sm text-muted">
                        Don&apos;t have an account?{" "}
                        <TextLink href="/signup" className="text-gold">
                            Sign up here
                        </TextLink>
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
