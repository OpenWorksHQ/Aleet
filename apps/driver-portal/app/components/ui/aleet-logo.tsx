type AleetLogoProps = {
    className?: string;
};

export function AleetLogo({ className }: AleetLogoProps) {
    return (
        <svg
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="Aleet logo"
        >
            {/* Outer circle */}
            <circle cx="40" cy="40" r="36" stroke="#c9a84c" strokeWidth="3" />
            {/* Letter A */}
            <path
                d="M40 20 L56 58 H24 Z"
                stroke="#c9a84c"
                strokeWidth="2.8"
                strokeLinejoin="round"
                fill="none"
            />
            {/* Crossbar */}
            <line
                x1="29"
                y1="46"
                x2="51"
                y2="46"
                stroke="#c9a84c"
                strokeWidth="2.8"
                strokeLinecap="round"
            />
        </svg>
    );
}
