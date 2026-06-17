// System icon library

type IconProps = { className?: string };

function IconBase({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            {children}
        </svg>
    );
}

export function CarIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <path d="M3 14h18" />
            <path d="M5 14V9.8a2 2 0 0 1 1.2-1.8l4.1-1.8a4 4 0 0 1 3.4 0L17.8 8A2 2 0 0 1 19 9.8V14" />
            <circle cx="7.5" cy="16.8" r="1.7" />
            <circle cx="16.5" cy="16.8" r="1.7" />
        </IconBase>
    );
}

export function MapPinIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
            <circle cx="12" cy="9" r="2.5" />
        </IconBase>
    );
}

export function PayoutIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <rect x="4" y="3" width="16" height="18" rx="2.5" />
            <path d="M8 8h8M8 12h8M8 16h4M15.5 15.5 18 18l2-2" />
        </IconBase>
    );
}

export function EliteIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <path d="M3 14h18" />
            <path d="M5 14V9.8a2 2 0 0 1 1.2-1.8l4.1-1.8a4 4 0 0 1 3.4 0L17.8 8A2 2 0 0 1 19 9.8V14" />
            <circle cx="7.5" cy="16.8" r="1.7" />
            <circle cx="16.5" cy="16.8" r="1.7" />
            <path d="m12 2.8 1 2 2.2.4-1.6 1.6.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.6 2.2-.4Z" />
        </IconBase>
    );
}

export function ScheduleIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <rect x="3" y="5" width="18" height="16" rx="2.5" />
            <path d="M8 3.5v3M16 3.5v3M3 10h18M8 14l2.2 2.2L16 11" />
        </IconBase>
    );
}

export function SunIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
            <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
            <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="12" y1="2.5" x2="12" y2="4.5" />
                <line x1="12" y1="19.5" x2="12" y2="21.5" />
                <line x1="2.5" y1="12" x2="4.5" y2="12" />
                <line x1="19.5" y1="12" x2="21.5" y2="12" />
                <line x1="5.45" y1="5.45" x2="6.86" y2="6.86" />
                <line x1="17.14" y1="17.14" x2="18.55" y2="18.55" />
                <line x1="18.55" y1="5.45" x2="17.14" y2="6.86" />
                <line x1="6.86" y1="17.14" x2="5.45" y2="18.55" />
            </g>
        </svg>
    );
}

export function MoonIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
            <path
                d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
