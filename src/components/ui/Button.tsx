import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-lime text-g4-bg hover:bg-lime-soft",
  secondary: "bg-g4-surface-alt text-white border border-g4-border hover:border-lime/60",
  ghost: "bg-transparent text-white hover:bg-g4-surface-alt",
};

// Classes compartilhadas para uso em <button> (Button) e em elementos não
// interativos-aninhados, como <a>, que precisam da mesma aparência (ex.: LinkButton).
export function buttonVariants(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5",
    "text-sm font-semibold transition-colors focus-ring disabled:opacity-50",
    "disabled:pointer-events-none",
    variantClasses[variant],
    className
  );
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={buttonVariants(variant, className)} {...props} />;
}
