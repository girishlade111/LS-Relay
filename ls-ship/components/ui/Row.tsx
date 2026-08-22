import type { ReactNode } from "react";

export interface RowProps {
  title: string;
  description?: string;
  action?: ReactNode;
  last?: boolean;
}

export function Row({ title, description, action, last = false }: RowProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-4${
        last ? "" : " border-b border-border"
      }`}
    >
      <div className="min-w-0">
        <p className="font-medium text-text">{title}</p>
        {description ? (
          <p className="mt-0.5 max-w-[440px] text-sm text-text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="ml-6 shrink-0">{action}</div> : null}
    </div>
  );
}
