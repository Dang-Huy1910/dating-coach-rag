import React from 'react';
import { useSession } from '../context/SessionContext';

export const DisclaimerBar: React.FC = () => {
  const { disclaimer } = useSession();

  return (
    <div className="w-full bg-charcoal text-paper-subtle py-1.5 px-4 text-center border-b border-charcoal-soft text-xs flex items-center justify-between z-50">
      <div className="flex items-center gap-2 mx-auto">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-pulse"></span>
        <span className="font-medium tracking-wide">
          <strong>Lưu ý:</strong> {disclaimer}
        </span>
      </div>
      <span className="hidden md:inline-block font-mono text-[11px] text-charcoal-faint">
        RAG v2.4 • Khung Tham Vấn
      </span>
    </div>
  );
};

