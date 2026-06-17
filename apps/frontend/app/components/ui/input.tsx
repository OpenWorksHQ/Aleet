import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-lg border border-[#1e2125] bg-[#090c0e] px-[14px] text-[15px] text-[#bababa] outline-none placeholder:text-[#5a5a5e] focus:border-[#3f4349] sm:h-[54px] sm:text-[16px]",
        className,
      )}
      {...props}
    />
  );
}
