import React from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-charcoal-deep text-white px-4 py-2.5 rounded-xl shadow-2xl border border-charcoal-soft flex items-center gap-2.5 text-xs font-medium">
        <div className="w-5 h-5 rounded-full bg-magenta-600 flex items-center justify-center text-white">
          <Check className="w-3 h-3" />
        </div>
        <span>{message}</span>
      </div>
    </div>
  );
};

