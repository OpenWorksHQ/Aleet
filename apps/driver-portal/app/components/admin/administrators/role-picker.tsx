import { cn } from "@/lib/utils";
import { ADMIN_ROLES, PERMISSION_LABELS, PERMISSION_COLORS } from "./admin-types";
import type { AdminRole } from "./admin-types";

type Props = {
    selected: AdminRole;
    onChange: (role: AdminRole) => void;
};

export function RolePicker({ selected, onChange }: Props) {
    return (
        <div className="flex flex-col gap-2">
            {(Object.entries(ADMIN_ROLES) as [AdminRole, typeof ADMIN_ROLES[AdminRole]][]).map(
                ([key, config]) => {
                    const isSelected = selected === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onChange(key)}
                            className={cn(
                                "flex flex-col items-start gap-2 rounded-xl border px-4 py-3 text-left transition-colors",
                                isSelected
                                    ? "border-gold bg-gold/10"
                                    : "border-border hover:border-gold/40 hover:bg-border/20",
                            )}
                        >
                            <div className="flex w-full items-center justify-between">
                                <span className={cn("text-sm font-semibold", isSelected ? "text-gold" : "text-text")}>
                                    {config.label}
                                </span>
                                <span className={cn(
                                    "h-4 w-4 rounded-full border-2 transition-colors",
                                    isSelected ? "border-gold bg-gold" : "border-muted bg-transparent",
                                )} />
                            </div>
                            <p className="text-xs text-muted">{config.description}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {config.permissions.map((p) => (
                                    <span
                                        key={p}
                                        className={cn(
                                            "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                            PERMISSION_COLORS[p],
                                        )}
                                    >
                                        {PERMISSION_LABELS[p]}
                                    </span>
                                ))}
                            </div>
                        </button>
                    );
                },
            )}
        </div>
    );
}
