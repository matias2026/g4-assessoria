import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "lime" | "neutral" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  lime: "bg-lime/15 text-lime-deep border-lime/40",
  neutral: "bg-g4-surface-alt text-g4-muted border-g4-border",
  danger: "bg-status-missed/10 text-status-missed border-status-missed/30",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
