'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full border transition-colors duration-150 ${
        checked ? 'bg-[#3ecf5e] border-[#3ecf5e]' : 'bg-[#242424] border-[#2a2a2a]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform duration-150 ${
          checked ? 'translate-x-4 bg-white' : 'translate-x-0.5 bg-[#5c5c5c]'
        }`}
      />
    </button>
  );
}
