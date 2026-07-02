import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-lg border border-aleet-border-strong bg-aleet-card px-[14px] text-[15px] text-aleet-text outline-none placeholder:text-aleet-text-subtle focus:border-aleet-gold sm:h-[54px] sm:text-[16px]",
        className,
      )}
      {...props}
    />
  );
}
