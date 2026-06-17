import { cn } from "@/lib/utils";

type Props = { icon: string; className?: string };

export function DriverNavIcon({ icon, className }: Props) {
    const cls = cn("h-[18px] w-[18px] shrink-0", className);

    const icons: Record<string, React.ReactNode> = {
        dashboard: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
        ),
        onboarding: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
        ),
        trips: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                <path d="M3 14h18" />
                <path d="M5 14V9.8a2 2 0 0 1 1.2-1.8l4.1-1.8a4 4 0 0 1 3.4 0L17.8 8A2 2 0 0 1 19 9.8V14" />
                <circle cx="7.5" cy="16.8" r="1.7" />
                <circle cx="16.5" cy="16.8" r="1.7" />
            </svg>
        ),
        earnings: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                <rect x="2" y="6" width="20" height="14" rx="2" />
                <path d="M16 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM6 10h.01M6 14h.01" />
                <path d="M2 10h20" />
            </svg>
        ),
        profile: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
        ),
        bank: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                <rect x="2" y="9" width="20" height="13" rx="2" />
                <path d="M12 2 2 9h20L12 2Z" />
                <path d="M9 13v5M12 13v5M15 13v5" />
            </svg>
        ),
        support: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls}>
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
        ),
    };

    return <>{icons[icon] ?? null}</>;
}
