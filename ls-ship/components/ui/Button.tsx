'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'accent' | 'danger';
  asChild?: boolean;
  children: ReactNode;
}

export default function Button({ variant = 'default', className = '', asChild, children, ...props }: ButtonProps) {
  const styles = {
    default: 'bg-[#242424] border-[#2a2a2a] text-[#e8e8e8] hover:bg-[#1c1c1c]',
    accent: 'bg-[#e07856]/10 border-[#e07856]/40 text-[#e07856] hover:bg-[#e07856]/20',
    danger: 'bg-[#e5484d]/10 border-[#e5484d]/40 text-[#e5484d] hover:bg-[#e5484d]/20',
  };

  if (asChild) {
    // When asChild is true, we render children directly (for Link composition)
    return <>{children}</>;
  }

  return (
    <button
      className={`rounded-[6px] border px-[14px] py-[6px] text-sm transition-colors ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
