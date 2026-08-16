'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'accent' | 'danger';
}

export function Button({ variant = 'default', className = '', ...props }: ButtonProps) {
  const styles = {
    default: 'bg-[#242424] border-[#2a2a2a] text-[#e8e8e8] hover:bg-[#1c1c1c]',
    accent: 'bg-[#e07856]/10 border-[#e07856]/40 text-[#e07856] hover:bg-[#e07856]/20',
    danger: 'bg-[#e5484d]/10 border-[#e5484d]/40 text-[#e5484d] hover:bg-[#e5484d]/20',
  };

  return (
    <button
      className={`rounded-[6px] border px-[14px] py-[6px] text-sm transition-colors ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
