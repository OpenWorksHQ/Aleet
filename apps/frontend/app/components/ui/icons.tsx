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

export function HomeIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <path d="m3 11 9-7 9 7" />
            <path d="M5 10.5V20h14v-9.5" />
            <path d="M10 20v-5h4v5" />
        </IconBase>
    );
}

export function HistoryIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v4h4" />
            <path d="M12 7v5l3 2" />
        </IconBase>
    );
}

export function CalendarPlusIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <rect x="3" y="5" width="18" height="16" rx="2.5" />
            <path d="M8 3.5v3M16 3.5v3M3 10h18M12 13v5M9.5 15.5h5" />
        </IconBase>
    );
}

export function ActiveTripIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <path d="M12 22a10 10 0 1 1 10-10" />
            <path d="M12 7v5l3 2" />
            <path d="M18.5 4.5v3m-1.5-1.5h3" />
        </IconBase>
    );
}

export function FleetIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <path d="M3 14h18" />
            <path d="M5 14V9.8a2 2 0 0 1 1.2-1.8l4.1-1.8a4 4 0 0 1 3.4 0L17.8 8A2 2 0 0 1 19 9.8V14" />
            <circle cx="7.5" cy="16.8" r="1.7" />
            <circle cx="16.5" cy="16.8" r="1.7" />
            <path d="M8.5 10.8h7" />
        </IconBase>
    );
}

export function EditIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <path d="m4 20 4.2-.8L20 7.4 16.6 4 4.8 15.8 4 20Z" />
            <path d="m14.8 5.8 3.4 3.4" />
        </IconBase>
    );
}

export function PhoneIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <path d="M7.2 5.6a1.8 1.8 0 0 1 2.3-.2L11 6.8a1.8 1.8 0 0 1 .4 2.2l-1 1.7a13 13 0 0 0 2.9 2.9l1.7-1a1.8 1.8 0 0 1 2.2.4l1.4 1.5a1.8 1.8 0 0 1-.2 2.3l-1 1c-.8.8-2 .9-3 .4a17.2 17.2 0 0 1-8.6-8.6c-.5-1-.4-2.2.4-3l1-1Z" />
        </IconBase>
    );
}

export function DashboardIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </IconBase>
    );
}

export function TripHistoryIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <path d="M12 8v4l2.5 2.5" />
            <path d="M3.05 11a9 9 0 1 0 .5-3" />
            <path d="M3 4.5v4h4" />
        </IconBase>
    );
}

export function BookTripIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <rect x="3" y="5" width="18" height="16" rx="2.5" />
            <path d="M8 3.5v3M16 3.5v3M3 10h18" />
            <path d="M12 14v4M10 16h4" />
        </IconBase>
    );
}

export function PaymentsIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <rect x="2" y="6" width="20" height="13" rx="2.5" />
            <path d="M2 10h20" />
            <path d="M6 14h4M15 14h3" />
        </IconBase>
    );
}

export function SubscriptionIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <rect x="4" y="3" width="16" height="18" rx="2.5" />
            <path d="M8 8h8M8 12h8M8 16h5" />
            <path d="M15.5 15.5 18 18l2.5-2.5" />
        </IconBase>
    );
}

export function SupportIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8a3 3 0 0 1 2.4 4.8c-.5.6-1.4 1-2.4 1.2v1" />
            <circle cx="12" cy="17.5" r="0.5" fill="currentColor" stroke="none" />
        </IconBase>
    );
}

export function ProfileIcon({ className }: IconProps) {
    return (
        <IconBase className={className}>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
        </IconBase>
    );
}
