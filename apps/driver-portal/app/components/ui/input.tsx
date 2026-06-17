import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-lg border border-border bg-page-bg px-3.5 text-[15px] text-text outline-none placeholder:text-muted focus:border-gold/50 sm:h-13.5 sm:text-[16px]",
        className,
      )}
      {...props}
    />
  );
}
