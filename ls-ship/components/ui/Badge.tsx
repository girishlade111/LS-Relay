import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'danger' | 'neutral';
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const styles = {
    success: 'border-[#3ecf5e] text-[#3ecf5e]',
    danger: 'border-[#e5484d] text-[#e5484d]',
    neutral: 'border-[#5c5c5c] text-[#5c5c5c]',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${styles[variant]}`}>
      {children}
    </span>
  );
}
