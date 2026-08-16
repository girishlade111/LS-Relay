import { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`rounded-[6px] border border-[#2a2a2a] bg-[#242424] px-3 py-[6px] text-sm text-[#e8e8e8] placeholder-[#5c5c5c] outline-none transition-colors focus:border-[#e07856]/40 ${className}`}
      {...props}
    />
  );
}
