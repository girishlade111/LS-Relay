import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "default" | "accent" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-panel-2 border-border text-text hover:bg-panel-hover hover:border-text-faint",
  accent:
    "bg-accent/10 border-accent/40 text-accent hover:bg-accent/20 hover:border-accent/60",
  danger:
    "bg-danger/10 border-danger/40 text-danger hover:bg-danger/20 hover:border-danger/60",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  href?: string;
}

export function Button({
  variant = "default",
  href,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex cursor-pointer items-center justify-center rounded-control border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:border-accent/60 ${
    variantClasses[variant]
  }${className ? ` ${className}` : ""}`;

  if (href !== undefined) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
