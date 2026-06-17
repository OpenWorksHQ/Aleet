import { AlertCircle } from "lucide-react";

export function ErrorBanner({ msg }: { msg: string }) {
    return (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{msg}</span>
        </div>
    );
}
