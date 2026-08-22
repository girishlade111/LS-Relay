import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-control border border-border bg-panel-2 px-3 py-1.5 text-sm text-text outline-none transition-colors duration-150 placeholder:text-faint focus:border-accent/50 disabled:opacity-50${
        className ? ` ${className}` : ""
      }`}
      {...props}
    />
  );
}
