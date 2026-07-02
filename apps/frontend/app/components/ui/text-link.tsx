import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export function TextLink({ className, ...props }: TextLinkProps) {
  return (
    <Link
      className={cn(
        "text-sm text-aleet-text-muted no-underline transition-colors hover:text-aleet-gold sm:text-[15px]",
        className,
      )}
      {...props}
    />
  );
}
