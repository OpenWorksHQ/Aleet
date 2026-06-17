import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost";
type ButtonSize = "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border-0 bg-linear-to-b from-[#bca066] from-[29%] to-[#998252] to-[100%] text-[#252728]",
  ghost: "border border-[#1e2125] bg-transparent text-[#bababa]",
};

const sizeStyles: Record<ButtonSize, string> = {
  md: "h-[50px] text-[16px] sm:h-[52px] sm:text-[17px]",
  lg: "h-[54px] text-[17px] sm:h-14 sm:text-[18px]",
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
        "inline-flex w-full cursor-pointer items-center justify-center rounded-lg px-4 font-bold uppercase transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60",
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
