import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn("mb-2 text-sm text-[#5a5a5e] sm:text-[15px]", className)}
      {...props}
    />
  );
}
