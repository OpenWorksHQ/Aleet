import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

type FormFieldProps = {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, htmlFor, children, className }: FormFieldProps) {
  return (
    <div className={cn("mb-5 sm:mb-[26px]", className)}>
      <Label htmlFor={htmlFor} className="block">
        {label}
      </Label>
      {children}
    </div>
  );
}
