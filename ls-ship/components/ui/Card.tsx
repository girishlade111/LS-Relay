import type { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={`rounded-card border border-border bg-panel${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </div>
  );
}
