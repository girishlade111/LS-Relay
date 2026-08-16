import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-[8px] border border-[#2a2a2a] bg-[#161616] ${className}`}>
      {children}
    </div>
  );
}
