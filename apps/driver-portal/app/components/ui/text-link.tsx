import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export function TextLink({ className, ...props }: TextLinkProps) {
  return (
    <Link
      className={cn(
        "text-sm text-[#bababa] no-underline transition-opacity hover:opacity-85 sm:text-[15px]",
        className,
      )}
      {...props}
    />
  );
}
