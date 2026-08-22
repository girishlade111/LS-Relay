import type { ReactNode } from "react";

export type BadgeVariant = "success" | "danger" | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  success: "border-success/40 text-success",
  danger: "border-danger/40 text-danger",
  neutral: "border-text-faint text-text-muted",
};

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
        variantClasses[variant]
      }`}
    >
      {children}
    </span>
  );
}
