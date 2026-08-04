import type { LabelHTMLAttributes } from "react";
import { cn } from "@aleet/shared";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn("mb-2 text-sm text-ui-label sm:text-[15px]", className)}
      {...props}
    />
  );
}
