import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SectionTitleProps = HTMLAttributes<HTMLHeadingElement>;

export function SectionTitle({ className, ...props }: SectionTitleProps) {
  return (
    <h1
      className={cn(
        "mb-7 text-center font-serif text-2xl font-medium sm:mb-[34px] sm:text-[clamp(24px,2.2vw,34px)]",
        className,
      )}
      {...props}
    />
  );
}
