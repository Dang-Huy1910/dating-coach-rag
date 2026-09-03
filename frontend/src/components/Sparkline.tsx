import React from 'react';

export const Sparkline: React.FC = () => {
  return (
    <div className="w-16 h-12 flex-shrink-0 flex items-center justify-center bg-paper-subtle rounded-xl p-1.5 border border-paper-border">
      <svg className="w-full h-full text-passion-500" fill="none" viewBox="0 0 64 32">
        <path
          d="M2 18H14L18 8L24 26L30 14L34 20H44L48 4L54 28L58 18H62"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </svg>
    </div>
  );
};

