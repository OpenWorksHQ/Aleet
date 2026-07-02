import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost" | "outline";
type ButtonSize = "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border-0 bg-aleet-gold text-aleet-text font-semibold hover:opacity-90",
  ghost:
    "border border-aleet-border bg-transparent text-aleet-text-muted hover:border-aleet-gold/40 hover:text-aleet-text",
  outline:
    "border border-aleet-border-strong bg-aleet-card text-aleet-text hover:border-aleet-gold/50",
};

const sizeStyles: Record<ButtonSize, string> = {
  md: "h-[50px] text-[15px] sm:h-[52px] sm:text-[16px]",
  lg: "h-[54px] text-[16px] sm:h-14 sm:text-[17px]",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={isLoading || disabled}
      className={cn(
        "inline-flex w-full cursor-pointer items-center justify-center rounded-lg px-4 transition-opacity disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-[1em] w-[1em] animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
