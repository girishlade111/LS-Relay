"use client";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Screen-reader label — a bare switch conveys no meaning on its own. */
  "aria-label"?: string;
}

export function Toggle({ checked, onChange, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      {...rest}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:border-accent/60 ${
        checked ? "border-success bg-success" : "border-border bg-panel-2"
      }`}
    >
      <span
        className={`absolute left-[2px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform duration-150 ${
          checked ? "translate-x-[18px] bg-white" : "bg-text-faint"
        }`}
      />
    </button>
  );
}
