import { type AnchorHTMLAttributes } from "react";
import { buttonVariants, type ButtonVariant } from "./Button";

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
}

// Link estilizado como botão (ex.: "Conectar ao Strava"), evitando aninhar
// <a> dentro de <button>.
export function LinkButton({ variant = "primary", className, ...props }: LinkButtonProps) {
  return <a className={buttonVariants(variant, className)} {...props} />;
}
