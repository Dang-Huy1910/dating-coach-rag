import React from 'react';
import { Sparkles } from 'lucide-react';

interface EmptyAiStateProps {
  title: string;
  description: string;
  hint?: string;
}

export const EmptyAiState: React.FC<EmptyAiStateProps> = ({
  title,
  description,
  hint = 'Bước tiếp theo → chạy phân tích / nhờ coach',
}) => (
  <div className="rounded-xl border border-dashed border-paper-border bg-paper-subtle/70 px-5 py-10 text-center space-y-3">
    <div className="mx-auto w-12 h-12 rounded-full bg-magenta-50 border border-magenta-200 text-magenta-600 flex items-center justify-center">
      <Sparkles className="w-5 h-5" aria-hidden="true" />
    </div>
    <div className="space-y-1.5 max-w-md mx-auto">
      <p className="text-sm font-semibold text-charcoal">{title}</p>
      <p className="text-xs text-charcoal-muted leading-relaxed">{description}</p>
    </div>
    {hint && <p className="text-[11px] font-mono text-magenta-700/80">{hint}</p>}
  </div>
);
