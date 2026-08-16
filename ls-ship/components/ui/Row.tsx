import { ReactNode } from 'react';

interface RowProps {
  title: string;
  description?: string;
  action?: ReactNode;
  last?: boolean;
}

export function Row({ title, description, action, last = false }: RowProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-[16px] ${!last ? 'border-b border-[#2a2a2a]' : ''}`}
    >
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-[#e8e8e8]">{title}</div>
        {description && (
          <div className="mt-0.5 max-w-[440px] text-[12.5px] text-[#8a8a8a]">
            {description}
          </div>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
