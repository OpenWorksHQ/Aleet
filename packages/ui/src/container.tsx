import type { HTMLAttributes } from "react";
import { cn } from "@aleet/shared";

type ContainerProps = HTMLAttributes<HTMLDivElement>;

export function Container({ className, ...props }: ContainerProps) {
  return <div className={cn("mx-auto w-full max-w-[420px]", className)} {...props} />;
}
