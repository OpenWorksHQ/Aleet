import type { InputHTMLAttributes } from "react";
import { cn } from "@aleet/shared";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-lg border border-ui-field-border bg-ui-field-bg px-3.5 text-[15px] text-ui-field-text outline-none placeholder:text-ui-field-placeholder focus:border-ui-field-focus sm:h-13.5 sm:text-[16px]",
        className,
      )}
      {...props}
    />
  );
}
