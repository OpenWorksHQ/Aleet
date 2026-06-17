const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type Props = {
    url: string | null;
    label: string;
    className?: string;
};

export function PhotoPreview({ url, label, className }: Props) {
    if (!url) {
        return (
            <div className={`self-start flex h-28 items-center justify-center rounded-xl border border-dashed border-border bg-page-bg text-xs text-muted${className ? ` ${className}` : ""}`}>
                No {label}
            </div>
        );
    }
    const src = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    return (
        <a href={src} target="_blank" rel="noopener noreferrer" className={`self-start block overflow-hidden rounded-xl border border-border/60 hover:border-gold/40 transition-colors${className ? ` ${className}` : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={label} className="h-28 w-full object-cover" />
            <p className="px-2 py-1 text-[11px] text-muted">{label}</p>
        </a>
    );
}
