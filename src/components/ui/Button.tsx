import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  // bg-lime não muda de tom entre os temas — o texto usa ink-on-lime (fixo,
  // sempre escuro) em vez de text-g4-ink, senão ficaria quase branco em
  // cima de verde limão no tema escuro.
  primary: "bg-lime text-ink-on-lime hover:brightness-95",
  secondary:
    "bg-g4-surface text-g4-ink border border-g4-border hover:border-lime-deep/50 hover:bg-g4-surface-alt",
  ghost: "bg-transparent text-g4-ink hover:bg-g4-surface-alt",
};

// Classes compartilhadas para uso em <button> (Button) e em elementos não
// interativos-aninhados, como <a>, que precisam da mesma aparência (ex.: LinkButton).
export function buttonVariants(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-4 rounded-xl px-4 py-2.5",
    "text-sm font-semibold transition-colors focus-ring disabled:opacity-50",
    "disabled:pointer-events-none",
    variantClasses[variant],
    className
  );
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={buttonVariants(variant, className)} {...props} />;
}
